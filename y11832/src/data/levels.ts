import { Level } from '../types';

export const levels: Level[] = [
  {
    id: 'level-001',
    name: '晚高峰闸机故障',
    description: '模拟晚高峰时段，3号闸机突发故障，需要快速疏散大量乘客。考验学员的广播播报、分流引导和区域封控能力。',
    mapId: 'map-001',
    duration: 180,
    passengerSpawnRate: 1.5,
    initialFaultyGates: ['gate-03'],
    targetPassengers: 150,
    difficulty: 'medium',
  },
  {
    id: 'level-002',
    name: '多闸机连锁故障',
    description: '高峰时段2号和4号闸机同时故障，客流压力巨大，需要灵活调整分流策略。',
    mapId: 'map-001',
    duration: 240,
    passengerSpawnRate: 2.0,
    initialFaultyGates: ['gate-02', 'gate-04'],
    targetPassengers: 200,
    difficulty: 'hard',
  },
  {
    id: 'level-003',
    name: '基础训练：单闸机故障',
    description: '适合新手练习，只有1号闸机故障，客流较少，重点练习基本操作流程。',
    mapId: 'map-001',
    duration: 120,
    passengerSpawnRate: 0.8,
    initialFaultyGates: ['gate-01'],
    targetPassengers: 80,
    difficulty: 'easy',
  },
];

export const getLevel = (id: string): Level | undefined => {
  return levels.find((level) => level.id === id);
};
