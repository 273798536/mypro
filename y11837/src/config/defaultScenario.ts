import type { ScenarioConfig } from '@/engine/types';

export const defaultScenario: ScenarioConfig = {
  mapWidth: 10,
  mapHeight: 8,
  chargerPositions: [
    { x: 0, y: 0 },
    { x: 9, y: 7 },
  ],
  dispatchPositions: [
    { x: 9, y: 0 },
    { x: 0, y: 7 },
  ],
  robots: [
    { id: 'R1', name: '阿尔法', color: '#3B82F6', startX: 1, startY: 3, maxBattery: 100, speed: 1 },
    { id: 'R2', name: '贝塔', color: '#22C55E', startX: 5, startY: 4, maxBattery: 100, speed: 1 },
    { id: 'R3', name: '伽马', color: '#F97316', startX: 8, startY: 3, maxBattery: 100, speed: 1 },
  ],
  shelves: {
    positions: [
      { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 5, y: 1 }, { x: 6, y: 1 },
      { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 5, y: 2 }, { x: 6, y: 2 },
      { x: 2, y: 5 }, { x: 3, y: 5 },
      { x: 5, y: 5 }, { x: 6, y: 5 },
      { x: 2, y: 6 }, { x: 3, y: 6 },
      { x: 5, y: 6 }, { x: 6, y: 6 },
    ],
    blockedAisles: [
      { x: 4, y: 1 },
      { x: 7, y: 5 },
    ],
  },
  orderInterval: 8,
  maxOrders: 5,
  timeLimit: 200,
};

export const sampleRobotOverrides: ScenarioConfig['robots'] = [
  { id: 'R1', name: '阿尔法', color: '#3B82F6', startX: 1, startY: 3, maxBattery: 80, speed: 1 },
  { id: 'R2', name: '贝塔', color: '#22C55E', startX: 5, startY: 4, maxBattery: 100, speed: 1 },
  { id: 'R3', name: '伽马', color: '#F97316', startX: 2, startY: 1, maxBattery: 100, speed: 1 },
];

export const sampleShelfOverrides: ScenarioConfig['shelves'] = {
  positions: [
    { x: 2, y: 1 }, { x: 3, y: 1 },
    { x: 5, y: 1 }, { x: 6, y: 1 },
    { x: 2, y: 2 }, { x: 3, y: 2 },
    { x: 5, y: 2 }, { x: 6, y: 2 },
    { x: 2, y: 5 }, { x: 3, y: 5 },
    { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 2, y: 6 }, { x: 3, y: 6 },
    { x: 5, y: 6 }, { x: 6, y: 6 },
    { x: 8, y: 4 },
  ],
  blockedAisles: [
    { x: 4, y: 1 },
    { x: 7, y: 5 },
    { x: 4, y: 4 },
  ],
};
