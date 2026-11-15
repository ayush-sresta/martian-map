// ---------------------------------------------------------------------------
// COST MODEL (what A* minimises)
//
//   edge cost = 3D distance × multiplier
//   multiplier = 1
//              + wSurface × surface.costFactor
//              + wTemperature × ((T − 5°C) / 65)²
//              + wSlope × (slope° / 15)²
//              − wInterest × 0.4 × interest
//
// A multiplier of 1 means "flat, comfortable, boring ground". The interest term
// is a discount, so routes bend toward scientifically interesting places.
// ---------------------------------------------------------------------------

export const DEFAULT_WEIGHTS = { slope: 1, surface: 1, temperature: 0.5, interest: 0.5 };

export const INTEREST_MAX_DISCOUNT = 0.4;
const T_IDEAL = 5; // °C where suit thermal load is lowest
const T_SPAN = 65;

export const tempTerm = (t) => ((t - T_IDEAL) / T_SPAN) ** 2;
export const slopeTerm = (deg) => (deg / 15) ** 2;

// Smallest multiplier any edge can have. Used by the A* heuristic, which keeps
// it admissible (never overestimates the remaining cost).
export function minMultiplier(w) {
  return Math.max(0.2, 1 - INTEREST_MAX_DISCOUNT * w.interest);
}

// Everything except slope, which depends on the edge and not the node.
export function nodeMultiplier(w, { temperature, surface, interest }) {
  return (
    1 +
    w.surface * surface.costFactor +
    w.temperature * tempTerm(temperature) -
    w.interest * INTEREST_MAX_DISCOUNT * interest
  );
}

export function edgeCost(w, minMult, dist3d, multA, multB, slopeDeg) {
  const m = Math.max(minMult, (multA + multB) / 2 + w.slope * slopeTerm(slopeDeg));
  return dist3d * m;
}

// ---------------------------------------------------------------------------
// WALKING SPEED MODEL (what the ETA uses)
//
// Tobler's hiking function, normalised so flat ground = 1, scaled by the
// surface's speedFactor and a base suited-walking speed (default 1.1 m/s).
// ---------------------------------------------------------------------------

export function slopeSpeedFactor(rise, run) {
  const gradient = rise / run;
  return Math.min(1.2, Math.exp(-3.5 * (Math.abs(gradient + 0.05) - 0.05)));
}

export function formatDuration(seconds) {
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
