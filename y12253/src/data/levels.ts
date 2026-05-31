import { LevelData } from '../types/game';

export const LEVEL_1: LevelData = {
  id: 'level-1',
  name: '基础声呐导航',
  description: '学习识别基本的声波反射模式，避开前方暗礁安全抵达目标',
  reefs: [
    { id: 'reef-1', x: 280, y: 180, width: 70, height: 100, type: 'rock' },
    { id: 'reef-2', x: 480, y: 320, width: 55, height: 85, type: 'coral' },
    { id: 'reef-3', x: 680, y: 130, width: 90, height: 70, type: 'debris' },
    { id: 'reef-4', x: 550, y: 80, width: 45, height: 60, type: 'rock' },
  ],
  misjudgmentTriggers: [
    {
      step: 3,
      type: 'ambiguous_echo',
      reason: '水流扰动导致波形畸变，回声边缘模糊',
      suggestion: '建议等待下一个脉冲确认，或降低航速至1档谨慎通过',
      reefId: 'reef-1'
    },
    {
      step: 5,
      type: 'multiple_reflections',
      reason: '多次反射回声叠加，在珊瑚礁上方形成假目标',
      suggestion: '注意观察回声强度变化，假目标通常强度较弱且不稳定',
      reefId: 'reef-2'
    }
  ],
  targetPosition: { x: 880, y: 250 },
  startPosition: { x: 50, y: 250 },
  maxSteps: 15
};

export const SAMPLE_DECISION_LOG = [
  {
    step: 1,
    action: 'sonar',
    isMissingFields: false,
    isLateEntry: false,
    remarks: '初始扫描',
    consequence: 'safe'
  },
  {
    step: 2,
    action: 'move',
    direction: 'right',
    speed: 2,
    isMissingFields: true,
    isLateEntry: false,
    remarks: '',
    consequence: 'safe'
  },
  {
    step: 3,
    action: 'sonar',
    isMissingFields: false,
    isLateEntry: false,
    remarks: '检测到前方障碍物',
    consequence: 'misjudgment'
  },
  {
    step: 4,
    action: 'move',
    direction: 'down',
    speed: 1,
    isMissingFields: false,
    isLateEntry: true,
    remarks: '规避暗礁',
    consequence: 'near-miss'
  },
  {
    step: 5,
    action: 'sonar',
    isMissingFields: false,
    isLateEntry: false,
    remarks: '发现多个回声信号',
    consequence: 'misjudgment'
  }
];

export const REFLECTION_COEFFICIENTS: Record<string, number> = {
  rock: 0.9,
  coral: 0.7,
  debris: 0.5
};

export const REEF_NAMES: Record<string, string> = {
  rock: '岩石暗礁',
  coral: '珊瑚群',
  debris: '沉船残骸'
};
