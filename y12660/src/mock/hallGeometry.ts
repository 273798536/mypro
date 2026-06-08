import type { SoundRay } from '@/types';

export interface HallSurface {
  id: string;
  name: string;
  points: [number, number, number][];
}

export const HALL_SIZE = { width: 30, depth: 40, height: 12 };

export function generateSoundRays(recordId: string, centerX: number, centerZ: number, count = 12): SoundRay[] {
  const rays: SoundRay[] = [];
  const startY = 1.5;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = 8 + Math.random() * 6;
    const ex = centerX + Math.cos(angle) * dist;
    const ez = centerZ + Math.sin(angle) * dist;
    const ey = 1 + Math.random() * 5;
    const blocked = i % 4 === 0 ? 'side_wall' : i % 5 === 0 ? 'balcony' : undefined;
    rays.push({
      id: `ray_${recordId}_${i}`,
      recordId,
      startPoint: [centerX, startY, centerZ],
      endPoint: [ex, ey, ez],
      blockedBy: blocked,
      energyLoss: blocked ? 0.5 + Math.random() * 0.3 : 0.05 + Math.random() * 0.1,
    });
  }
  return rays;
}

export const HALL_SURFACES: HallSurface[] = [
  {
    id: 'stage',
    name: '舞台',
    points: [
      [-10, 0, -18],
      [10, 0, -18],
      [10, 0, -10],
      [-10, 0, -10],
    ],
  },
];
