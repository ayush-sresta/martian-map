import express from "express";
import cors from "cors";
import { ApiError } from "./errors.js";
import { LOCATIONS, findLocation } from "./locations.js";
import { wrap360 } from "./geo.js";
import { planRoute } from "./planner.js";
import { sampleTerrain } from "./terrain.js";

const app = express();
app.use(cors());
app.use(express.json());

// ---- Input parsing ---------------------------------------------------------

function fromCoords(lat, lon, label) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiError(400, `"${label}" needs numeric latitude and longitude`);
  }
  if (Math.abs(lat) > 85) {
    throw new ApiError(400, `"${label}" latitude must be within ±85°`);
  }
  return { latitude: lat, longitude: wrap360(lon) };
}

// Accepts a location name, a "lat,lon" string, or { name } / { latitude, longitude }
function parsePoint(input, label) {
  if (input === undefined || input === null || input === "") {
    throw new ApiError(400, `"${label}" is required`);
  }

  if (typeof input === "string") {
    const loc = findLocation(input);
    if (loc) return { name: loc.name, latitude: loc.latitude, longitude: loc.longitude };

    const parts = input.split(",").map((s) => Number(s.trim()));
    if (parts.length === 2) return fromCoords(parts[0], parts[1], label);

    throw new ApiError(400, `"${label}" is not a known location or a "lat,lon" pair`);
  }

  if (typeof input === "object") {
    if (input.name) {
      const loc = findLocation(input.name);
      if (!loc) throw new ApiError(400, `Unknown location "${input.name}"`);
      return { name: loc.name, latitude: loc.latitude, longitude: loc.longitude };
    }
    return fromCoords(Number(input.latitude), Number(input.longitude), label);
  }

  throw new ApiError(400, `"${label}" is invalid`);
}

// ---- Routes ----------------------------------------------------------------

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/locations", (_req, res) => res.json(LOCATIONS));

// Inspect what the planner sees at one point
app.get("/api/terrain", (req, res) => {
  const p = fromCoords(Number(req.query.lat), Number(req.query.lon), "point");
  const hour = req.query.hour === undefined ? 12 : Number(req.query.hour);
  const s = sampleTerrain(p.latitude, p.longitude, hour);
  res.json({
    latitude: s.latitude,
    longitude: s.longitude,
    elevationM: Math.round(s.elevation),
    temperatureC: Math.round(s.temperature * 10) / 10,
    surface: s.surface.name,
    interest: Math.round(s.interest * 100) / 100,
  });
});

// POST /api/path
// {
//   "start": "Jezero Crater" | "18.38,77.58" | { "latitude": 18.38, "longitude": 77.58 },
//   "goal":  ...same forms...,
//   "weights": { "slope": 1, "surface": 1, "temperature": 0.5, "interest": 0.5 },
//   "localSolarHour": 12, "maxSlopeDeg": 25, "walkingSpeedMs": 1.1,
//   "evaHoursPerSol": 8, "maxGridDim": 200
// }
app.post("/api/path", (req, res) => {
  const { start, goal, ...options } = req.body ?? {};
  res.json(planRoute(parsePoint(start, "start"), parsePoint(goal, "goal"), options));
});

// GET /api/path?start=Jezero Crater&goal=Gale Crater&hour=12&wSlope=1&wInterest=1
app.get("/api/path", (req, res) => {
  const q = req.query;
  const options = {
    localSolarHour: q.hour,
    maxSlopeDeg: q.maxSlope,
    walkingSpeedMs: q.speed,
    evaHoursPerSol: q.evaHours,
    maxGridDim: q.gridDim,
    weights: {
      slope: q.wSlope,
      surface: q.wSurface,
      temperature: q.wTemperature,
      interest: q.wInterest,
    },
  };
  res.json(planRoute(parsePoint(q.start, "start"), parsePoint(q.goal, "goal"), options));
});

// ---- Errors ----------------------------------------------------------------

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, ...(err.hint && { hint: err.hint }) });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`Mars pathfinding API on http://localhost:${PORT}`));
