import { SceneConfig } from './types';

export const SCENES: SceneConfig[] = [
  {
    id: 'scene-001',
    name: '东城区主干管爆裂',
    difficulty: 'medium',
    description: '东城区三号路主干管发生爆裂，需要快速关闭相关阀门控制漏点，同时尽量减少对居民的影响。注意：主阀V-001关闭将影响大片区域！',
    targetTime: 180,
    nodes: [
      { id: 'source-1', type: 'source', x: 100, y: 300, name: '水厂出口', basePressure: 0.8 },
      { id: 'junc-1', type: 'junction', x: 200, y: 300, name: 'J-01' },
      { id: 'valve-1', type: 'valve', x: 300, y: 300, name: 'V-001', isMainValve: true },
      { id: 'junc-2', type: 'junction', x: 400, y: 300, name: 'J-02' },
      { id: 'junc-3', type: 'junction', x: 500, y: 200, name: 'J-03' },
      { id: 'junc-4', type: 'junction', x: 500, y: 400, name: 'J-04' },
      { id: 'valve-2', type: 'valve', x: 600, y: 200, name: 'V-002' },
      { id: 'valve-3', type: 'valve', x: 600, y: 400, name: 'V-003' },
      { id: 'junc-5', type: 'junction', x: 700, y: 200, name: 'J-05' },
      { id: 'junc-6', type: 'junction', x: 700, y: 400, name: 'J-06' },
      { id: 'valve-4', type: 'valve', x: 800, y: 150, name: 'V-004' },
      { id: 'valve-5', type: 'valve', x: 800, y: 250, name: 'V-005' },
      { id: 'valve-6', type: 'valve', x: 800, y: 350, name: 'V-006' },
      { id: 'valve-7', type: 'valve', x: 800, y: 450, name: 'V-007' },
      { id: 'leak-1', type: 'leak', x: 550, y: 300, name: 'L-001' },
      { id: 'user-1', type: 'user', x: 900, y: 150, name: '幸福小区' },
      { id: 'user-2', type: 'user', x: 900, y: 250, name: '阳光花园' },
      { id: 'user-3', type: 'user', x: 900, y: 350, name: '绿洲公寓' },
      { id: 'user-4', type: 'user', x: 900, y: 450, name: '金海社区' },
    ],
    connections: [
      { id: 'pipe-1', from: 'source-1', to: 'junc-1', diameter: 800 },
      { id: 'pipe-2', from: 'junc-1', to: 'valve-1', diameter: 800 },
      { id: 'pipe-3', from: 'valve-1', to: 'junc-2', diameter: 800 },
      { id: 'pipe-4', from: 'junc-2', to: 'junc-3', diameter: 600 },
      { id: 'pipe-5', from: 'junc-2', to: 'junc-4', diameter: 600 },
      { id: 'pipe-6', from: 'junc-3', to: 'valve-2', diameter: 500 },
      { id: 'pipe-7', from: 'junc-4', to: 'valve-3', diameter: 500 },
      { id: 'pipe-8', from: 'valve-2', to: 'junc-5', diameter: 500 },
      { id: 'pipe-9', from: 'valve-3', to: 'junc-6', diameter: 500 },
      { id: 'pipe-10', from: 'junc-5', to: 'valve-4', diameter: 400 },
      { id: 'pipe-11', from: 'junc-5', to: 'valve-5', diameter: 400 },
      { id: 'pipe-12', from: 'junc-6', to: 'valve-6', diameter: 400 },
      { id: 'pipe-13', from: 'junc-6', to: 'valve-7', diameter: 400 },
      { id: 'pipe-14', from: 'valve-4', to: 'user-1', diameter: 300 },
      { id: 'pipe-15', from: 'valve-5', to: 'user-2', diameter: 300 },
      { id: 'pipe-16', from: 'valve-6', to: 'user-3', diameter: 300 },
      { id: 'pipe-17', from: 'valve-7', to: 'user-4', diameter: 300 },
      { id: 'pipe-18', from: 'junc-2', to: 'leak-1', diameter: 400 },
    ],
    initialValves: [
      { nodeId: 'valve-1', isOpen: true },
      { nodeId: 'valve-2', isOpen: true },
      { nodeId: 'valve-3', isOpen: true },
      { nodeId: 'valve-4', isOpen: true },
      { nodeId: 'valve-5', isOpen: true },
      { nodeId: 'valve-6', isOpen: true },
      { nodeId: 'valve-7', isOpen: true },
    ],
    leaks: [
      { nodeId: 'leak-1', flowRate: 150 },
    ],
    userZones: [
      { id: 'zone-1', nodeIds: ['user-1'], name: '幸福小区', population: 1200, hasWater: true },
      { id: 'zone-2', nodeIds: ['user-2'], name: '阳光花园', population: 800, hasWater: true },
      { id: 'zone-3', nodeIds: ['user-3'], name: '绿洲公寓', population: 1500, hasWater: true },
      { id: 'zone-4', nodeIds: ['user-4'], name: '金海社区', population: 2000, hasWater: true },
    ],
  },
];

export const WARNING_MESSAGES: Record<string, { title: string; description: string; severity: 'danger' | 'warning' }> = {
  main_valve: {
    title: '⚠️ 主阀操作警告',
    description: '您正在操作主供水阀门！关闭此阀门将影响所有下游区域，可能导致大面积停水。请确认这是必要操作。',
    severity: 'danger',
  },
  low_pressure: {
    title: '⚠️ 低压风险警告',
    description: '当前操作可能导致管网压力过低，影响消防供水和高层用户用水。建议调整关阀策略。',
    severity: 'warning',
  },
  duplicate_zone: {
    title: '⚠️ 重复影响警告',
    description: '该区域用户已受之前操作影响停水，再次操作不会改善止漏效果但会增加用户影响时长。',
    severity: 'warning',
  },
};

export const SCORE_CONFIG = {
  leakControl: {
    perControlled: 20,
    perUncontrolled: -10,
  },
  userImpact: {
    perPerson: -0.1,
    duplicateZonePenalty: -5,
  },
  operationEfficiency: {
    baseScore: 100,
    perStep: -2,
    timeBonus: 0.5,
  },
  compliance: {
    mainValvePenalty: -50,
    lowPressurePenalty: -30,
    duplicatePenalty: -10,
  },
};

export const PRESSURE_CONFIG = {
  minNormal: 0.3,
  maxNormal: 0.8,
  lowPressureThreshold: 0.2,
  decayPerUnit: 0.001,
  leakImpact: 0.15,
};
