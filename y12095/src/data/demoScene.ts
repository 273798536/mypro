import { Stage, Musician, Cable } from '@/types';

export const demoMusicians: Musician[] = [
  {
    id: 'm1',
    name: '主唱',
    instrument: 'VOC',
    x: 0,
    z: -3,
    rotation: 0,
    color: '#e94560',
    radius: 0.8,
  },
  {
    id: 'm2',
    name: '主音吉他',
    instrument: 'GTR',
    x: -3.5,
    z: -2,
    rotation: 30,
    color: '#0f4c5c',
    radius: 0.8,
  },
  {
    id: 'm3',
    name: '节奏吉他',
    instrument: 'RHY',
    x: 3.5,
    z: -2,
    rotation: -30,
    color: '#0f4c5c',
    radius: 0.8,
  },
  {
    id: 'm4',
    name: '贝斯手',
    instrument: 'BAS',
    x: -4,
    z: 1,
    rotation: 45,
    color: '#16213e',
    radius: 0.8,
  },
  {
    id: 'm5',
    name: '鼓手',
    instrument: 'DRM',
    x: 0,
    z: 2.5,
    rotation: 0,
    color: '#1a1a2e',
    radius: 1.5,
  },
  {
    id: 'm6',
    name: '键盘手',
    instrument: 'KEY',
    x: 4,
    z: 1,
    rotation: -45,
    color: '#16213e',
    radius: 1.0,
  },
];

export const demoCables: Cable[] = [
  {
    id: 'c1',
    fromId: 'm1',
    toId: 'm5',
    points: [
      [0, 0.1, -3],
      [-2, 0.1, -1],
      [-2, 0.1, 2],
      [0, 0.1, 2.5],
    ],
    color: '#3b82f6',
    thickness: 0.05,
  },
  {
    id: 'c2',
    fromId: 'm2',
    toId: 'm5',
    points: [
      [-3.5, 0.1, -2],
      [-3, 0.1, 0],
      [-1, 0.1, 1],
      [0, 0.1, 2.5],
    ],
    color: '#22c55e',
    thickness: 0.05,
  },
  {
    id: 'c3',
    fromId: 'm3',
    toId: 'm5',
    points: [
      [3.5, 0.1, -2],
      [3, 0.1, 0],
      [1, 0.1, 1],
      [0, 0.1, 2.5],
    ],
    color: '#f59e0b',
    thickness: 0.05,
  },
  {
    id: 'c4',
    fromId: 'm4',
    toId: 'm5',
    points: [
      [-4, 0.1, 1],
      [-2, 0.1, 1.5],
      [0, 0.1, 2.5],
    ],
    color: '#8b5cf6',
    thickness: 0.05,
  },
  {
    id: 'c5',
    fromId: 'm6',
    toId: 'm5',
    points: [
      [4, 0.1, 1],
      [2, 0.1, 1.5],
      [0, 0.1, 2.5],
    ],
    color: '#ec4899',
    thickness: 0.05,
  },
  {
    id: 'c6',
    fromId: 'm1',
    toId: 'm3',
    points: [
      [0, 0.1, -3],
      [2, 0.1, -2.5],
      [3.5, 0.1, -2],
    ],
    color: '#06b6d4',
    thickness: 0.05,
  },
];

export const demoStage: Stage = {
  width: 12,
  depth: 8,
  height: 0.3,
  musicians: demoMusicians,
  cables: demoCables,
};

export const createStageWithoutCables = (): Stage => ({
  ...demoStage,
  cables: [],
});

export const createStageWithCables = (): Stage => ({
  ...demoStage,
  cables: demoCables,
});
