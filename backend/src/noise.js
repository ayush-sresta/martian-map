// Deterministic value noise that wraps seamlessly around 360° of longitude.

const mod = (a, n) => ((a % n) + n) % n;

function hash(ix, iy, seed) {
  let h =
    Math.imul(ix, 374761393) ^
    Math.imul(iy, 668265263) ^
    Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x, y, period, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const xa = mod(x0, period);
  const xb = mod(x0 + 1, period);
  const a = hash(xa, y0, seed);
  const b = hash(xb, y0, seed);
  const c = hash(xa, y0 + 1, seed);
  const d = hash(xb, y0 + 1, seed);
  const top = a + (b - a) * u;
  const bottom = c + (d - c) * u;
  return top + (bottom - top) * v;
}

// Fractal noise in 0..1. `lon` must already be in 0-360.
// baseScaleDeg must divide 360 (and stay integral over octaves) so it wraps.
export function fbm(lon, lat, baseScaleDeg, octaves, seed) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const scale = baseScaleDeg / 2 ** o;
    const period = Math.round(360 / scale);
    sum += amp * valueNoise(lon / scale, (lat + 90) / scale, period, seed + o);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}
