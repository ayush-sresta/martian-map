import { performance } from "node:perf_hooks";
import { astar } from "./astar.js";
import { ApiError } from "./errors.js";
import { haversine, wrap180, wrap360, METERS_PER_DEG } from "./geo.js";
import { LOCATIONS } from "./locations.js";
import { sampleTerrain } from "./terrain.js";
import {
  DEFAULT_WEIGHTS,
  edgeCost,
  formatDuration,
  minMultiplier,
  nodeMultiplier,
  slopeSpeedFactor,
} from "./cost.js";

const DEG = 180 / Math.PI;
const MIN_CELL_DEG = 0.002; // ~120 m
const OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const r = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function num(value, name, min, max, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ApiError(400, `"${name}" must be a number between ${min} and ${max}`);
  }
  return n;
}

function resolveOptions(raw = {}) {
  const w = raw.weights && typeof raw.weights === "object" ? raw.weights : {};
  return {
    weights: {
      slope: num(w.slope, "weights.slope", 0, 5, DEFAULT_WEIGHTS.slope),
      surface: num(w.surface, "weights.surface", 0, 5, DEFAULT_WEIGHTS.surface),
      temperature: num(w.temperature, "weights.temperature", 0, 5, DEFAULT_WEIGHTS.temperature),
      interest: num(w.interest, "weights.interest", 0, 2, DEFAULT_WEIGHTS.interest),
    },
    localSolarHour: num(raw.localSolarHour, "localSolarHour", 0, 24, 12),
    maxSlopeDeg: num(raw.maxSlopeDeg, "maxSlopeDeg", 5, 45, 25),
    walkingSpeedMs: num(raw.walkingSpeedMs, "walkingSpeedMs", 0.3, 2.5, 1.1),
    evaHoursPerSol: num(raw.evaHoursPerSol, "evaHoursPerSol", 1, 24, 8),
    maxGridDim: num(raw.maxGridDim, "maxGridDim", 20, 400, 200),
    padFraction: 0.3,
  };
}

// ---------------------------------------------------------------------------

export function planRoute(start, goal, rawOptions = {}) {
  const t0 = performance.now();
  const o = resolveOptions(rawOptions);
  const w = o.weights;
  const minMult = minMultiplier(w);

  const straightLine = haversine(start.latitude, start.longitude, goal.latitude, goal.longitude);
  if (straightLine < 1) throw new ApiError(400, "Start and goal are the same point");

  // ---- Grid: bounding box around start/goal, longitude unwrapped across 0/360
  const dLon = wrap180(goal.longitude - start.longitude);
  const sLon = start.longitude;
  const gLon = sLon + dLon;
  const pad = Math.max(0.2, o.padFraction * Math.max(Math.abs(goal.latitude - start.latitude), Math.abs(dLon)));
  const latMin = Math.max(-85, Math.min(start.latitude, goal.latitude) - pad);
  const latMax = Math.min(85, Math.max(start.latitude, goal.latitude) + pad);
  const lonMin = Math.min(sLon, gLon) - pad;
  const lonMax = Math.max(sLon, gLon) + pad;
  const cell = Math.max(MIN_CELL_DEG, Math.max(latMax - latMin, lonMax - lonMin) / (o.maxGridDim - 1));
  const nx = Math.floor((lonMax - lonMin) / cell) + 1;
  const ny = Math.floor((latMax - latMin) / cell) + 1;
  const N = nx * ny;

  const latOf = (id) => latMin + Math.floor(id / nx) * cell;
  const lonOf = (id) => lonMin + (id % nx) * cell;

  // ---- Per-node terrain (elevation + everything except slope)
  const elev = new Float32Array(N);
  const mult = new Float32Array(N);
  for (let id = 0; id < N; id++) {
    const s = sampleTerrain(latOf(id), lonOf(id), o.localSolarHour);
    elev[id] = s.elevation;
    mult[id] = nodeMultiplier(w, s);
  }

  const snap = (lat, lon) =>
    clamp(Math.round((lat - latMin) / cell), 0, ny - 1) * nx +
    clamp(Math.round((lon - lonMin) / cell), 0, nx - 1);
  const startId = snap(start.latitude, sLon);
  const goalId = snap(goal.latitude, gLon);
  const goalLat = latOf(goalId);
  const goalLon = lonOf(goalId);

  // ---- A*
  const found = astar({
    size: N,
    start: startId,
    goal: goalId,
    heuristic: (id) => haversine(latOf(id), lonOf(id), goalLat, goalLon) * minMult,
    forEachNeighbor: (id, visit) => {
      const i = id % nx;
      const j = (id - i) / nx;
      for (const [di, dj] of OFFSETS) {
        const ni = i + di;
        const nj = j + dj;
        if (ni >= 0 && nj >= 0 && ni < nx && nj < ny) visit(nj * nx + ni);
      }
    },
    edgeCost: (a, b) => {
      const horiz = haversine(latOf(a), lonOf(a), latOf(b), lonOf(b));
      const dz = elev[b] - elev[a];
      const slopeDeg = Math.atan2(Math.abs(dz), horiz) * DEG;
      if (slopeDeg > o.maxSlopeDeg) return Infinity;
      return edgeCost(w, minMult, Math.hypot(horiz, dz), mult[a], mult[b], slopeDeg);
    },
  });

  if (!found) {
    throw new ApiError(
      422,
      "No traversable route found",
      `Every connection is steeper than maxSlopeDeg (${o.maxSlopeDeg}°). Raise it or pick different endpoints.`,
    );
  }

  // ---- Waypoints: exact start/goal, snapped grid nodes in between
  const inner = found.path.slice(1, -1).map((id) => [latOf(id), wrap360(lonOf(id))]);
  const coords = [[start.latitude, start.longitude], ...inner, [goal.latitude, goal.longitude]];
  const points = coords.map(([lat, lon]) => sampleTerrain(lat, lon, o.localSolarHour));

  return buildResult({ start, goal, points, straightLine, o, cell, nx, ny, found, t0 });
}

// ---------------------------------------------------------------------------

function buildResult({ start, goal, points, straightLine, o, cell, nx, ny, found, t0 }) {
  let distance = 0;
  let seconds = 0;
  let ascent = 0;
  let descent = 0;
  let maxSlope = 0;
  let tempWeighted = 0;
  const surfaceMeters = new Map();

  const cumDist = [0];
  const cumTime = [0];

  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const horiz = haversine(a.latitude, a.longitude, b.latitude, b.longitude);
    const dz = b.elevation - a.elevation;
    const dist = Math.hypot(horiz, dz);
    const slopeDeg = horiz > 0 ? Math.atan2(Math.abs(dz), horiz) * DEG : 0;
    const surfaceFactor = (a.surface.speedFactor + b.surface.speedFactor) / 2;
    const speed = horiz > 0
      ? o.walkingSpeedMs * slopeSpeedFactor(dz, horiz) * surfaceFactor
      : o.walkingSpeedMs;

    distance += dist;
    seconds += dist / speed;
    if (dz > 0) ascent += dz;
    else descent -= dz;
    maxSlope = Math.max(maxSlope, slopeDeg);
    tempWeighted += ((a.temperature + b.temperature) / 2) * dist;

    for (const p of [a, b]) {
      surfaceMeters.set(p.surface.name, (surfaceMeters.get(p.surface.name) ?? 0) + dist / 2);
    }

    cumDist.push(distance);
    cumTime.push(seconds);
  }

  const temps = points.map((p) => p.temperature);

  // Listed sites close to the route
  const tolerance = Math.max(100_000, 1.5 * cell * METERS_PER_DEG);
  const sitesNearPath = LOCATIONS.map((loc) => ({
    name: loc.name,
    distanceFromPathKm: r(
      Math.min(...points.map((p) => haversine(p.latitude, p.longitude, loc.latitude, loc.longitude))) / 1000,
      1,
    ),
  }))
    .filter((s) => s.distanceFromPathKm * 1000 <= tolerance)
    .sort((x, y) => x.distanceFromPathKm - y.distanceFromPathKm);

  return {
    start: { name: start.name ?? null, latitude: start.latitude, longitude: start.longitude },
    goal: { name: goal.name ?? null, latitude: goal.latitude, longitude: goal.longitude },
    summary: {
      distanceM: Math.round(distance),
      distanceKm: r(distance / 1000, 1),
      straightLineKm: r(straightLine / 1000, 1),
      detourRatio: r(distance / straightLine, 3),
      walkingTime: {
        seconds: Math.round(seconds),
        hours: r(seconds / 3600, 1),
        formatted: formatDuration(seconds),
      },
      evaSols: Math.ceil(seconds / (o.evaHoursPerSol * 3600)),
      ascentM: Math.round(ascent),
      descentM: Math.round(descent),
      maxSlopeDeg: r(maxSlope, 1),
      temperatureC: {
        average: r(tempWeighted / distance, 1),
        min: r(Math.min(...temps), 1),
        max: r(Math.max(...temps), 1),
      },
      surfaces: [...surfaceMeters.entries()]
        .map(([surface, m]) => ({ surface, percent: r((m / distance) * 100, 1) }))
        .sort((x, y) => y.percent - x.percent),
      sitesNearPath,
    },
    path: points.map((p, k) => ({
      latitude: r(p.latitude, 5),
      longitude: r(p.longitude, 5),
      elevationM: Math.round(p.elevation),
      temperatureC: r(p.temperature, 1),
      surface: p.surface.name,
      interest: r(p.interest, 2),
      distanceFromStartM: Math.round(cumDist[k]),
      elapsedSeconds: Math.round(cumTime[k]),
    })),
    // Flat [lon, lat, lon, lat, ...] ready for Cesium.Cartesian3.fromDegreesArray
    positions: points.flatMap((p) => [r(p.longitude, 5), r(p.latitude, 5)]),
    meta: {
      gridCellKm: r((cell * METERS_PER_DEG) / 1000, 2),
      gridSize: [nx, ny],
      pathCost: Math.round(found.cost),
      nodesExpanded: found.expanded,
      computeMs: Math.round(performance.now() - t0),
      options: o,
    },
  };
}
