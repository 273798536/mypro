import type { CoordinateSystem, Vec3 } from '../types';

const WGS84_TO_UTM51N_SCALE = 111000;
const LOCAL_ORIGIN = { x: 121.5, y: 25.0, z: 0 };

export function transformToScene(
  x: number,
  y: number,
  z_m: number,
  system: CoordinateSystem
): Vec3 {
  switch (system) {
    case 'WGS84':
      return {
        x: (x - LOCAL_ORIGIN.x) * WGS84_TO_UTM51N_SCALE * 0.001,
        y: -z_m,
        z: (y - LOCAL_ORIGIN.y) * WGS84_TO_UTM51N_SCALE * 0.001,
      };
    case 'UTM51N':
      return {
        x: (x - 250000) * 0.001,
        y: -z_m,
        z: (y - 2760000) * 0.001,
      };
    case 'LOCAL':
      return {
        x: x * 0.01,
        y: -z_m,
        z: y * 0.01,
      };
  }
}

export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function formatCoordinate(system: CoordinateSystem, x: number, y: number, z: number): string {
  switch (system) {
    case 'WGS84':
      return `${x.toFixed(6)}°E, ${y.toFixed(6)}°N, 水深${z.toFixed(1)}m`;
    case 'UTM51N':
      return `E${x.toFixed(1)} N${y.toFixed(1)}, 水深${z.toFixed(1)}m [UTM51N]`;
    case 'LOCAL':
      return `X${x.toFixed(2)} Y${y.toFixed(2)} 水深${z.toFixed(1)}m [LOCAL]`;
  }
}
