import type { Trajectory, Position3D } from '@/types';

function generateTrajectoryPoints(
  bounds: [number, number, number, number],
  pointsCount: number,
  seed: number
): Position3D[] {
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const points: Position3D[] = [];
  const [minX, minZ, maxX, maxZ] = bounds;
  const startX = minX + random() * (maxX - minX);
  const startZ = minZ + random() * (maxZ - minZ);
  const endX = minX + random() * (maxX - minX);
  const endZ = maxZ;

  for (let i = 0; i < pointsCount; i++) {
    const t = i / (pointsCount - 1);
    const x = startX + (endX - startX) * t + (random() - 0.5) * 5;
    const z = startZ + (endZ - startZ) * t + (random() - 0.5) * 3;
    const y = 2 + random() * 3;
    points.push({ x, y, z });
  }

  return points;
}

const slopeBounds: Record<string, [number, number, number, number]> = {
  'slope-001': [-50, 0, -10, 40],
  'slope-002': [-10, 0, 30, 40],
  'slope-003': [-50, -50, -10, 0],
  'slope-004': [-10, -50, 30, 0],
  'slope-005': [30, -50, 70, 0],
  'slope-006': [30, 0, 70, 50],
};

export const trajectories: Trajectory[] = [];

const trajectoryConfigs = [
  { slopeId: 'slope-001', count: 15, baseTime: new Date('2026-05-27T09:00:00') },
  { slopeId: 'slope-002', count: 12, baseTime: new Date('2026-05-27T09:30:00') },
  { slopeId: 'slope-003', count: 8, baseTime: new Date('2026-05-27T10:00:00') },
  { slopeId: 'slope-004', count: 6, baseTime: new Date('2026-05-27T10:30:00') },
  { slopeId: 'slope-005', count: 4, baseTime: new Date('2026-05-27T11:00:00') },
  { slopeId: 'slope-006', count: 2, baseTime: new Date('2026-05-27T11:30:00') },
];

let trajectoryId = 1;
trajectoryConfigs.forEach((config) => {
  for (let i = 0; i < config.count; i++) {
    const startTime = new Date(config.baseTime);
    startTime.setMinutes(startTime.getMinutes() + i * 15);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 5 + Math.floor(Math.random() * 10));

    trajectories.push({
      id: `traj-${String(trajectoryId++).padStart(3, '0')}`,
      slopeId: config.slopeId,
      points: generateTrajectoryPoints(
        slopeBounds[config.slopeId],
        20,
        trajectoryId * 100
      ),
      startTime,
      endTime,
      averageSpeed: 15 + Math.random() * 25,
      skierId: `skier-${String(100 + trajectoryId).padStart(3, '0')}`,
      source: 'GPS定位数据',
    });
  }
});

export const getTrajectoriesBySlopeId = (slopeId: string): Trajectory[] => {
  return trajectories.filter((t) => t.slopeId === slopeId);
};

export const getTrajectoryHeatmapData = (
  bounds: [number, number, number, number],
  resolution: number
): number[][] => {
  const [minX, minZ, maxX, maxZ] = bounds;
  const grid: number[][] = [];
  const cellWidth = (maxX - minX) / resolution;
  const cellHeight = (maxZ - minZ) / resolution;

  for (let i = 0; i < resolution; i++) {
    grid.push(new Array(resolution).fill(0));
  }

  trajectories.forEach((traj) => {
    traj.points.forEach((point) => {
      const gx = Math.floor((point.x - minX) / cellWidth);
      const gz = Math.floor((point.z - minZ) / cellHeight);
      if (gx >= 0 && gx < resolution && gz >= 0 && gz < resolution) {
        grid[gz][gx] += 1;
      }
    });
  });

  return grid;
};
