import type { LevelConfig, WeatherEvent } from '../types/game';

export const LEVELS: LevelConfig[] = [
  {
    id: 'basic',
    name: '基础训练关',
    description: '风暴后基础抢修调度训练。学习基础调度规则',
    difficulty: 'easy',
    maxRounds: 12,
    initialTeams: [
      { id: 'team-1', name: '抢修一班', skills: ['line_repair', 'cable'] },
      { id: 'team-2', name: '抢修二班', skills: ['transformer', 'substation'] }
    ],
    initialAreas: [
      {
        id: 'area-1',
        name: '中心医院',
        type: 'hospital',
        priority: 1,
        requiredSkill: 'line_repair',
        userCount: 500,
        reward: 300,
        penalty: 500
      },
      {
        id: 'area-2',
        name: '阳光小区',
        type: 'residential',
        priority: 3,
        requiredSkill: 'line_repair',
        userCount: 2000,
        reward: 200,
        penalty: 200
      },
      {
        id: 'area-3',
        name: '商业街',
        type: 'commercial',
        priority: 4,
        requiredSkill: 'transformer',
        userCount: 800,
        reward: 250,
        penalty: 300
      }
    ],
    initialSpareParts: [
      { id: 'part-1', name: '电缆', quantity: 6 },
      { id: 'part-2', name: '变压器', quantity: 3 }
    ],
    weatherSequence: [
      { id: 'w-0', type: 'normal', description: '天气晴朗，抢修条件良好', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-1', type: 'typhoon', description: '台风影响，抢修冷却时间+1', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-2', type: 'typhoon', description: '台风持续，抢修冷却时间+1', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-3', type: 'rainstorm', description: '暴雨天气，抢修难度加大', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-4', type: 'normal', description: '天气转好', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-5', type: 'lightning', description: '雷电天气，注意安全', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-6', type: 'normal', description: '天气恢复正常', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-7', type: 'fog', description: '大雾天气，能见度低', effectOnRound: 1, cooldownModifier: 0 },
      { id: 'w-8', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-9', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-10', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-11', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 }
    ],
    timeoutThreshold: 4,
    baseExecuteRounds: 2,
    baseCooldownRounds: 1,
    sparePartPerRepair: 1
  },
  {
    id: 'intermediate',
    name: '进阶训练关',
    description: '更高难度的调度训练，更多区域和更严格的超时限制',
    difficulty: 'normal',
    maxRounds: 15,
    initialTeams: [
      { id: 'team-1', name: '抢修一班', skills: ['line_repair'] },
      { id: 'team-2', name: '抢修二班', skills: ['transformer', 'cable'] },
      { id: 'team-3', name: '抢修三班', skills: ['substation', 'line_repair'] }
    ],
    initialAreas: [
      {
        id: 'area-1',
        name: '第一人民医院',
        type: 'hospital',
        priority: 1,
        requiredSkill: 'line_repair',
        userCount: 800,
        reward: 400,
        penalty: 600
      },
      {
        id: 'area-2',
        name: '中心医院',
        type: 'hospital',
        priority: 2,
        requiredSkill: 'cable',
        userCount: 500,
        reward: 350,
        penalty: 500
      },
      {
        id: 'area-3',
        name: '阳光小区',
        type: 'residential',
        priority: 3,
        requiredSkill: 'line_repair',
        userCount: 3000,
        reward: 200,
        penalty: 200
      },
      {
        id: 'area-4',
        name: '幸福小区',
        type: 'residential',
        priority: 4,
        requiredSkill: 'transformer',
        userCount: 2500,
        reward: 180,
        penalty: 180
      },
      {
        id: 'area-5',
        name: '商业街',
        type: 'commercial',
        priority: 5,
        requiredSkill: 'transformer',
        userCount: 1000,
        reward: 250,
        penalty: 300
      }
    ],
    initialSpareParts: [
      { id: 'part-1', name: '电缆', quantity: 8 },
      { id: 'part-2', name: '变压器', quantity: 4 },
      { id: 'part-3', name: '绝缘子', quantity: 6 }
    ],
    weatherSequence: [
      { id: 'w-0', type: 'typhoon', description: '台风来袭，抢修冷却时间+1', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-1', type: 'typhoon', description: '台风持续', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-2', type: 'rainstorm', description: '暴雨天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-3', type: 'typhoon', description: '台风再次来袭', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-4', type: 'lightning', description: '雷电天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-5', type: 'rainstorm', description: '暴雨持续', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-6', type: 'normal', description: '天气转好', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-7', type: 'fog', description: '大雾天气', effectOnRound: 1, cooldownModifier: 0 },
      { id: 'w-8', type: 'normal', description: '天气恢复正常', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-9', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-10', type: 'lightning', description: '雷电天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-11', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-12', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-13', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-14', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 }
    ],
    timeoutThreshold: 3,
    baseExecuteRounds: 2,
    baseCooldownRounds: 2,
    sparePartPerRepair: 1
  },
  {
    id: 'challenge',
    name: '挑战关',
    description: '极限挑战！复杂的调度局面，资源极度紧张',
    difficulty: 'hard',
    maxRounds: 18,
    initialTeams: [
      { id: 'team-1', name: '抢修一班', skills: ['line_repair', 'cable'] },
      { id: 'team-2', name: '抢修二班', skills: ['transformer'] },
      { id: 'team-3', name: '抢修三班', skills: ['substation'] },
      { id: 'team-4', name: '抢修四班', skills: ['line_repair', 'transformer'] }
    ],
    initialAreas: [
      {
        id: 'area-1',
        name: '第一人民医院',
        type: 'hospital',
        priority: 1,
        requiredSkill: 'line_repair',
        userCount: 1000,
        reward: 500,
        penalty: 800
      },
      {
        id: 'area-2',
        name: '中心医院',
        type: 'hospital',
        priority: 2,
        requiredSkill: 'cable',
        userCount: 600,
        reward: 400,
        penalty: 600
      },
      {
        id: 'area-3',
        name: '儿童医院',
        type: 'hospital',
        priority: 2,
        requiredSkill: 'transformer',
        userCount: 400,
        reward: 350,
        penalty: 500
      },
      {
        id: 'area-4',
        name: '阳光小区',
        type: 'residential',
        priority: 4,
        requiredSkill: 'line_repair',
        userCount: 3500,
        reward: 200,
        penalty: 200
      },
      {
        id: 'area-5',
        name: '幸福小区',
        type: 'residential',
        priority: 4,
        requiredSkill: 'transformer',
        userCount: 2800,
        reward: 180,
        penalty: 180
      },
      {
        id: 'area-6',
        name: '和平小区',
        type: 'residential',
        priority: 5,
        requiredSkill: 'line_repair',
        userCount: 2000,
        reward: 150,
        penalty: 150
      },
      {
        id: 'area-7',
        name: '商业街',
        type: 'commercial',
        priority: 5,
        requiredSkill: 'transformer',
        userCount: 1200,
        reward: 250,
        penalty: 300
      },
      {
        id: 'area-8',
        name: '工业区',
        type: 'industrial',
        priority: 6,
        requiredSkill: 'substation',
        userCount: 500,
        reward: 300,
        penalty: 350
      }
    ],
    initialSpareParts: [
      { id: 'part-1', name: '电缆', quantity: 10 },
      { id: 'part-2', name: '变压器', quantity: 5 },
      { id: 'part-3', name: '绝缘子', quantity: 8 }
    ],
    weatherSequence: [
      { id: 'w-0', type: 'typhoon', description: '强台风来袭！抢修冷却时间+2', effectOnRound: 3, cooldownModifier: 2 },
      { id: 'w-1', type: 'typhoon', description: '台风持续', effectOnRound: 2, cooldownModifier: 2 },
      { id: 'w-2', type: 'typhoon', description: '台风持续', effectOnRound: 2, cooldownModifier: 1 },
      { id: 'w-3', type: 'rainstorm', description: '暴雨天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-4', type: 'lightning', description: '雷电天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-5', type: 'typhoon', description: '台风再次来袭', effectOnRound: 2, cooldownModifier: 2 },
      { id: 'w-6', type: 'rainstorm', description: '暴雨持续', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-7', type: 'lightning', description: '雷电天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-8', type: 'rainstorm', description: '暴雨持续', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-9', type: 'normal', description: '天气转好', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-10', type: 'fog', description: '大雾天气', effectOnRound: 1, cooldownModifier: 0 },
      { id: 'w-11', type: 'normal', description: '天气正常', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-12', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-13', type: 'lightning', description: '雷电天气', effectOnRound: 1, cooldownModifier: 1 },
      { id: 'w-14', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-15', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-16', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 },
      { id: 'w-17', type: 'normal', description: '天气晴朗', effectOnRound: 0, cooldownModifier: 0 }
    ],
    timeoutThreshold: 3,
    baseExecuteRounds: 3,
    baseCooldownRounds: 2,
    sparePartPerRepair: 2
  }
];

export function getLevelById(id: string): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getWeatherForRound(level: LevelConfig, round: number): WeatherEvent {
  return level.weatherSequence[round] || level.weatherSequence[level.weatherSequence.length - 1];
}