import type { SeedPoint } from '@/types';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGridSeedPoints(
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number],
  count: number = 20,
  seed: number = 42
): SeedPoint[] {
  const random = mulberry32(seed);
  const points: SeedPoint[] = [];
  
  for (let i = 0; i < count; i++) {
    const x = xRange[0] + random() * (xRange[1] - xRange[0]);
    const y = yRange[0] + random() * (yRange[1] - yRange[0]);
    const z = zRange[0] + random() * (zRange[1] - zRange[0]);
    
    points.push({
      id: `seed-${String(i + 1).padStart(3, '0')}`,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      label: `种子点 ${i + 1}`,
    });
  }
  
  return points;
}

export const defaultSeedPoints: SeedPoint[] = [
  { id: 'seed-001', x: 1.0, y: 0.0, z: 0.5, label: '种子点 1' },
  { id: 'seed-002', x: -1.0, y: 1.0, z: 1.0, label: '种子点 2' },
  { id: 'seed-003', x: 0.5, y: -1.0, z: 0.0, label: '种子点 3' },
  { id: 'seed-004', x: -0.5, y: 0.5, z: 1.5, label: '种子点 4' },
  { id: 'seed-005', x: 1.5, y: -0.5, z: 0.8, label: '种子点 5' },
  { id: 'seed-006', x: -1.5, y: -1.0, z: 0.3, label: '种子点 6' },
  { id: 'seed-007', x: 0.0, y: 1.5, z: 1.2, label: '种子点 7' },
  { id: 'seed-008', x: 0.8, y: 0.8, z: 0.6, label: '种子点 8' },
  { id: 'seed-009', x: -0.8, y: -0.8, z: 0.9, label: '种子点 9' },
  { id: 'seed-010', x: 1.2, y: -1.2, z: 0.2, label: '种子点 10' },
];

export const boundaryTestSeedPoints: SeedPoint[] = [
  { id: 'seed-b01', x: 0.1, y: 0.1, z: 0.1, label: '原点附近（爆炸风险）' },
  { id: 'seed-b02', x: 2.5, y: 0.0, z: 0.0, label: '边界附近（越界风险）' },
  { id: 'seed-b03', x: 0.0, y: 2.5, z: 0.0, label: '边界附近（越界风险）' },
  { id: 'seed-b04', x: -2.5, y: -2.5, z: 1.5, label: '角落（越界风险）' },
  { id: 'seed-b05', x: 1.0, y: -1.0, z: 0.5, label: '方向反转区' },
  { id: 'seed-b06', x: -1.0, y: 1.0, z: -0.5, label: '方向反转区' },
];
