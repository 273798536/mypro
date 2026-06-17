const LNG_MIN = 116.30;
const LNG_MAX = 116.42;
const LAT_MIN = 39.85;
const LAT_MAX = 39.95;

const X_MIN = -100;
const X_MAX = 100;
const Z_MIN = -80;
const Z_MAX = 80;

export interface Coord3D {
  x: number;
  y: number;
  z: number;
}

export function lngLatToXZ(lng: number, lat: number, y = 0): Coord3D {
  const lngRatio = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
  const latRatio = (lat - LAT_MIN) / (LAT_MAX - LAT_MIN);

  const clampedLngRatio = Math.max(0, Math.min(1, lngRatio));
  const clampedLatRatio = Math.max(0, Math.min(1, latRatio));

  const x = X_MIN + clampedLngRatio * (X_MAX - X_MIN);
  const z = Z_MAX - clampedLatRatio * (Z_MAX - Z_MIN);

  return { x, y, z };
}
