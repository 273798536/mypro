import { WindRose } from '@/types';

const generateDirections = (baseFreq: number[], baseSpeed: number[]) => {
  return Array.from({ length: 16 }, (_, i) => ({
    angle: i * 22.5,
    speed: baseSpeed[i] || (2 + Math.random() * 4),
    frequency: baseFreq[i] || (0.02 + Math.random() * 0.08)
  }));
};

export const mockWindRoses: WindRose[] = [
  {
    id: 'wr-001',
    name: '夏季主导风向',
    directions: generateDirections(
      [0.02, 0.03, 0.05, 0.08, 0.12, 0.15, 0.18, 0.14, 0.08, 0.04, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01],
      [1.5, 2.0, 2.8, 3.5, 4.2, 4.8, 5.2, 4.5, 3.2, 2.2, 1.8, 1.5, 1.2, 1.0, 0.8, 1.0]
    ),
    source: '风环境团队',
    createdAt: '2026-03-15',
    season: 'summer'
  },
  {
    id: 'wr-002',
    name: '冬季主导风向',
    directions: generateDirections(
      [0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.16, 0.18, 0.14, 0.08, 0.04, 0.03, 0.02, 0.02, 0.01],
      [2.5, 3.0, 3.8, 4.5, 5.2, 5.8, 6.2, 5.8, 5.0, 4.0, 3.0, 2.2, 1.8, 1.5, 1.2, 1.8]
    ),
    source: '风环境团队',
    createdAt: '2026-03-16',
    season: 'winter'
  }
];

export const mockMergeConflicts = [
  {
    id: 'mc-001',
    buildingId: 'b-004',
    fieldName: 'height',
    buildingValue: 54,
    windRoseValue: 48,
    resolved: false,
    resolution: null
  },
  {
    id: 'mc-002',
    buildingId: 'b-007',
    fieldName: 'position',
    buildingValue: [-50, 0, -25],
    windRoseValue: [-48, 0, -22],
    resolved: false,
    resolution: null
  },
  {
    id: 'mc-003',
    buildingId: 'b-011',
    fieldName: 'dimensions',
    buildingValue: [30, 30, 25],
    windRoseValue: [25, 30, 20],
    resolved: false,
    resolution: null
  }
];
