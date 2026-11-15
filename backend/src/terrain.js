// ---------------------------------------------------------------------------
// TERRAIN DATA LAYER
//
// Everything the planner knows about the ground comes through sampleTerrain().
// The values here are a SYNTHETIC approximation (large landforms + noise) so the
// service runs with no data files. To use real data, keep the same return shape
// and replace elevationAt() with a MOLA DEM lookup and surfaceAt() with a
// real surface-unit / thermal-inertia / rock-abundance lookup.
// ---------------------------------------------------------------------------

import { METERS_PER_DEG, haversine, wrap180, wrap360 } from "./geo.js";
import { fbm } from "./noise.js";
import { LOCATIONS } from "./locations.js";

const rad = (d) => (d * Math.PI) / 180;

// ---- Elevation -------------------------------------------------------------

// lat/lon in °, amp in m, sigmas in km (E-W / N-S). shape 1 = gaussian,
// higher = flatter floor with steeper walls.
const FEATURES = [
  { name: "Tharsis bulge", lat: 3, lon: 258, amp: 7000, sE: 1400, sN: 1400, shape: 1 },
  { name: "Olympus Mons", lat: 18.65, lon: 226.2, amp: 19000, sE: 140, sN: 140, shape: 1.5 },
  { name: "Arsia Mons", lat: -8.26, lon: 239.91, amp: 6500, sE: 120, sN: 120, shape: 1.5 },
  { name: "Pavonis Mons", lat: 0, lon: 247, amp: 7000, sE: 110, sN: 110, shape: 1.5 },
  { name: "Ascraeus Mons", lat: 11.92, lon: 255.92, amp: 8000, sE: 120, sN: 120, shape: 1.5 },
  { name: "Alba Mons", lat: 41.08, lon: 249.29, amp: 3500, sE: 300, sN: 300, shape: 1 },
  { name: "Elysium rise", lat: 24, lon: 147, amp: 3000, sE: 600, sN: 600, shape: 1 },
  { name: "Elysium Mons", lat: 25.02, lon: 147.21, amp: 9000, sE: 90, sN: 90, shape: 1.5 },
  { name: "Apollinaris Mons", lat: -9.17, lon: 174.79, amp: 4500, sE: 80, sN: 80, shape: 1.5 },
  { name: "Hellas basin", lat: -42.43, lon: 70.5, amp: -8000, sE: 450, sN: 450, shape: 2 },
  { name: "Argyre basin", lat: -50, lon: 320, amp: -4000, sE: 250, sN: 250, shape: 2 },
  { name: "Isidis basin", lat: 12, lon: 88, amp: -3500, sE: 250, sN: 250, shape: 2 },
  { name: "Utopia basin", lat: 45, lon: 110, amp: -3500, sE: 600, sN: 600, shape: 1 },
  { name: "Jezero crater", lat: 18.38, lon: 77.58, amp: -1500, sE: 18, sN: 18, shape: 2 },
  { name: "Gale crater", lat: -5.4, lon: 137.8, amp: -2500, sE: 60, sN: 60, shape: 2 },
  { name: "Mount Sharp", lat: -5.08, lon: 137.85, amp: 4500, sE: 15, sN: 15, shape: 1 },
  { name: "Valles Marineris", lat: -14, lon: 301.4, amp: -6000, sE: 900, sN: 130, shape: 3 },
];

function featureValue(f, lat, lon) {
  const dN = ((lat - f.lat) * METERS_PER_DEG) / 1000;
  const dE = (wrap180(lon - f.lon) * Math.cos(rad(f.lat)) * METERS_PER_DEG) / 1000;
  const r2 = (dE / f.sE) ** 2 + (dN / f.sN) ** 2;
  return f.amp * Math.exp(-0.5 * r2 ** f.shape);
}

export function elevationAt(lat, lon) {
  // Southern highlands / northern lowlands dichotomy
  let h = -2500 * Math.tanh(lat / 35);
  for (const f of FEATURES) h += featureValue(f, lat, lon);
  // Regional relief
  h += 1200 * (fbm(lon, lat, 8, 6, 1) - 0.5) * 2;
  return h;
}

// ---- Surface condition -----------------------------------------------------
// costFactor: extra path-cost multiplier (sinkage, instability, slipperiness)
// speedFactor: fraction of normal walking speed achievable

export const SURFACES = {
  bedrock: { name: "Bedrock / outcrop", costFactor: 0.0, speedFactor: 1.0 },
  regolith: { name: "Compacted regolith", costFactor: 0.1, speedFactor: 0.95 },
  frost: { name: "Frost / ice-bound ground", costFactor: 0.5, speedFactor: 0.75 },
  boulders: { name: "Boulder field", costFactor: 0.8, speedFactor: 0.65 },
  dust: { name: "Loose dust / fines", costFactor: 0.6, speedFactor: 0.7 },
  dunes: { name: "Dune field", costFactor: 0.9, speedFactor: 0.6 },
};

export function surfaceAt(lat, lon, elevation) {
  if (Math.abs(lat) > 72) return "frost";
  if (elevation > 5000) return "bedrock"; // volcanic flanks
  const s = fbm(lon, lat, 6, 4, 7);
  if (s < 0.4) return "dust";
  if (s < 0.44) return "dunes";
  if (s < 0.58) return "regolith";
  if (s < 0.65) return "bedrock";
  return "boulders";
}

// ---- Scientific interest (0-1) --------------------------------------------
// Strongest value of any listed site, fading with distance (σ = 120 km).

const INTEREST_SIGMA_M = 120_000;

export function interestAt(lat, lon) {
  let best = 0;
  for (const loc of LOCATIONS) {
    const d = haversine(lat, lon, loc.latitude, loc.longitude);
    if (d > 4 * INTEREST_SIGMA_M) continue;
    best = Math.max(best, loc.interest * Math.exp(-0.5 * (d / INTEREST_SIGMA_M) ** 2));
  }
  return best;
}

// ---- Temperature (°C) ------------------------------------------------------
// Mean falls with latitude and altitude; a diurnal swing rides on top.
// localSolarHour: 0-24, warmest around 14:00.

export function temperatureAt(lat, elevation, localSolarHour = 12) {
  const mean = -40 - 70 * Math.sin(rad(lat)) ** 2 - 2.5 * (elevation / 1000);
  const swing = 35 * Math.cos(rad(lat)) + 5;
  return mean + swing * Math.cos((2 * Math.PI * (localSolarHour - 14)) / 24);
}

// ---- Combined sample -------------------------------------------------------

export function sampleTerrain(lat, lon, localSolarHour = 12) {
  const longitude = wrap360(lon);
  const elevation = elevationAt(lat, longitude);
  const surfaceId = surfaceAt(lat, longitude, elevation);
  return {
    latitude: lat,
    longitude,
    elevation,
    temperature: temperatureAt(lat, elevation, localSolarHour),
    surfaceId,
    surface: SURFACES[surfaceId],
    interest: interestAt(lat, longitude),
  };
}
