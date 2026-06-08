import type { CoordinateSystem } from '@/types';

export function detectCoordinateSystem(x: number, y: number, z: number): CoordinateSystem {
  if (x >= -180 && x <= 180 && y >= -90 && y <= 90 && Math.abs(z) < 12000) {
    if (Number.isInteger(x) && Number.isInteger(y) && Math.abs(x) > 1 && Math.abs(y) > 1) {
      return 'WGS84';
    }
  }
  if (Math.abs(x) < 1000 && Math.abs(y) < 1000 && Math.abs(z) < 1000) {
    return 'CARTESIAN';
  }
  if (Math.abs(x) < 100 && Math.abs(y) < 100 && Math.abs(z) < 100) {
    return 'LOCAL';
  }
  return 'UNKNOWN';
}

export function isOutOfBounds(x: number, y: number, z: number, bounds = { x: 5, y: 5, zMin: -6, zMax: 4 }): boolean {
  return Math.abs(x) > bounds.x || Math.abs(y) > bounds.y || z < bounds.zMin || z > bounds.zMax;
}

export function hasCoordinateMix(systems: CoordinateSystem[]): boolean {
  const uniq = Array.from(new Set(systems.filter((s) => s !== 'UNKNOWN')));
  return uniq.length > 1;
}
