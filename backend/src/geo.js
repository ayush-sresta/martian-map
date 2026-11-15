// Same radius the Cesium reference uses.
export const MARS_RADIUS = 3_396_190;
export const METERS_PER_DEG = (Math.PI / 180) * MARS_RADIUS;

const rad = (d) => (d * Math.PI) / 180;

// Mars longitudes are handled as 0-360 °E (matches the reference MARS_LOCATIONS).
export const wrap360 = (lon) => ((lon % 360) + 360) % 360;
export const wrap180 = (lon) => wrap360(lon + 180) - 180;

export function haversine(lat1, lon1, lat2, lon2) {
  const p1 = rad(lat1);
  const p2 = rad(lat2);
  const a =
    Math.sin((p2 - p1) / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * MARS_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
}
