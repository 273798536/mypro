import { TunnelSegment } from '@/types';

export const TUNNEL_SEGMENTS: TunnelSegment[] = [
  {
    id: 'seg-1',
    start: [-20, 0, 0],
    end: [10, 0, 0],
    width: 4,
    height: 3,
  },
  {
    id: 'seg-2',
    start: [10, 0, -15],
    end: [10, 0, 15],
    width: 4,
    height: 3,
  },
  {
    id: 'seg-3',
    start: [10, 0, 15],
    end: [30, 0, 15],
    width: 4,
    height: 3,
  },
  {
    id: 'seg-4',
    start: [10, 0, -15],
    end: [30, 0, -15],
    width: 4,
    height: 3,
  },
  {
    id: 'seg-5',
    start: [-20, 0, 0],
    end: [-20, 0, -10],
    width: 4,
    height: 3,
  },
];

export const TUNNEL_CENTER = [5, 0, 0] as [number, number, number];

export const WALL_BOUNDS = [
  { minX: -22, maxX: 12, minZ: -2, maxZ: 2 },
  { minX: 8, maxX: 12, minZ: -17, maxZ: 17 },
  { minX: 8, maxX: 32, minZ: 13, maxZ: 17 },
  { minX: 8, maxX: 32, minZ: -17, maxZ: -13 },
  { minX: -22, maxX: -18, minZ: -12, maxZ: 2 },
];

export function isPointInWall(x: number, z: number): boolean {
  for (const bound of WALL_BOUNDS) {
    if (
      x >= bound.minX &&
      x <= bound.maxX &&
      z >= bound.minZ &&
      z <= bound.maxZ
    ) {
      return false;
    }
  }
  return true;
}

export function checkSegmentCrossesWall(
  p1: [number, number, number],
  p2: [number, number, number]
): boolean {
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1[0] + (p2[0] - p1[0]) * t;
    const z = p1[2] + (p2[2] - p1[2]) * t;
    if (isPointInWall(x, z)) {
      return true;
    }
  }
  return false;
}
