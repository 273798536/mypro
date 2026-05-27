import type { Position3D } from '@/types';

export const distance3D = (p1: Position3D, p2: Position3D): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const distance2D = (
  p1: { x: number; z: number },
  p2: { x: number; z: number }
): number => {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const pointInBounds = (
  point: { x: number; z: number },
  bounds: [number, number, number, number]
): boolean => {
  const [minX, minZ, maxX, maxZ] = bounds;
  return (
    point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ
  );
};

export const generateGridFromHeightMap = (
  heightMap: number[][],
  bounds: [number, number, number, number],
  heightScale: number = 1
): { positions: Float32Array; indices: Uint32Array } => {
  const rows = heightMap.length;
  const cols = heightMap[0].length;
  const [minX, minZ, maxX, maxZ] = bounds;
  const cellWidth = (maxX - minX) / (cols - 1);
  const cellDepth = (maxZ - minZ) / (rows - 1);

  const positions = new Float32Array(rows * cols * 3);
  const indices = new Uint32Array((rows - 1) * (cols - 1) * 6);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = (i * cols + j) * 3;
      positions[idx] = minX + j * cellWidth;
      positions[idx + 1] = heightMap[i][j] * heightScale;
      positions[idx + 2] = minZ + i * cellDepth;
    }
  }

  let idx = 0;
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices[idx++] = a;
      indices[idx++] = c;
      indices[idx++] = b;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }

  return { positions, indices };
};

export const calculateSlopeAngle = (
  heightMap: number[][],
  cellSize: number
): number[][] => {
  const rows = heightMap.length;
  const cols = heightMap[0].length;
  const slopes: number[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      const h = heightMap[i][j];
      const hx =
        j > 0 && j < cols - 1
          ? (heightMap[i][j + 1] - heightMap[i][j - 1]) / (2 * cellSize)
          : 0;
      const hz =
        i > 0 && i < rows - 1
          ? (heightMap[i + 1][j] - heightMap[i - 1][j]) / (2 * cellSize)
          : 0;
      const slopeRad = Math.atan(Math.sqrt(hx * hx + hz * hz));
      row.push((slopeRad * 180) / Math.PI);
    }
    slopes.push(row);
  }

  return slopes;
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
