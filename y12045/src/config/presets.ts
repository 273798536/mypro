import type { PresetScene, GameConfig } from '../engine/types';

const defaultPreset: GameConfig = {
  duration: 120,
  packageInterval: [2, 5],
  urgentRatio: 0.2,
  damagedRatio: 0.1,
  destinations: ['A', 'B', 'C'],
  priorityWeights: [0.4, 0.3, 0.15, 0.1, 0.05],
  processingTimeRange: [3, 8],
  deadlineRange: [15, 45],
  lineCapacity: 5,
  starvationThreshold: 20,
  congestionThreshold: 0.8,
};

export const presetScenes: PresetScene[] = [
  {
    id: 'default',
    name: '标准模式',
    description: '混合包裹类型，体验完整分拣流程',
    config: defaultPreset,
    algorithm: '综合练习',
    teachingPoint: '学习如何平衡不同优先级和类型的包裹',
  },
  {
    id: 'starvation-demo',
    name: '急件饥饿演示',
    description: '大量低优先级包裹容易导致急件饥饿，适合演示饥饿问题',
    config: {
      ...defaultPreset,
      duration: 90,
      packageInterval: [1, 3],
      urgentRatio: 0.1,
      damagedRatio: 0,
      priorityWeights: [0.6, 0.2, 0.1, 0.05, 0.05],
      processingTimeRange: [5, 10],
      starvationThreshold: 15,
    },
    algorithm: '优先级队列 vs FIFO',
    teachingPoint: '使用 FIFO 策略时，高优先级急件会被大量低优先级普通件阻塞。切换到优先级策略可解决此问题。',
  },
  {
    id: 'congestion-demo',
    name: '路线堵塞演示',
    description: '目的地分布不均，容易造成单条线路堵塞',
    config: {
      ...defaultPreset,
      duration: 100,
      packageInterval: [1, 2],
      urgentRatio: 0.1,
      damagedRatio: 0.05,
      destinations: ['A', 'A', 'B', 'C'],
      processingTimeRange: [4, 8],
      lineCapacity: 4,
      congestionThreshold: 0.7,
    },
    algorithm: '路径选择算法',
    teachingPoint: '当大量包裹发往同一目的地时，简单的目的地匹配策略会造成单条线路拥堵。使用最短队列策略可平衡负载。',
  },
  {
    id: 'sjf-demo',
    name: '最短作业优先演示',
    description: '处理时间差异大，体验 SJF 策略的优劣',
    config: {
      ...defaultPreset,
      duration: 100,
      packageInterval: [2, 4],
      urgentRatio: 0.15,
      damagedRatio: 0.1,
      processingTimeRange: [2, 15],
      deadlineRange: [20, 60],
    },
    algorithm: '贪心算法 (SJF)',
    teachingPoint: 'SJF 策略能最大化吞吐量，但长作业可能长时间等待。观察长作业的等待时间变化。',
  },
  {
    id: 'damaged-demo',
    name: '破损件处理演示',
    description: '大量破损件需要额外处理时间',
    config: {
      ...defaultPreset,
      duration: 90,
      packageInterval: [2, 4],
      urgentRatio: 0.1,
      damagedRatio: 0.3,
      processingTimeRange: [3, 6],
      deadlineRange: [12, 30],
    },
    algorithm: '资源预留',
    teachingPoint: '破损件需要额外处理时间。如果不为破损件预留处理时隙，会导致大量超时。',
  },
];

export const getPresetById = (id: string): PresetScene | undefined => {
  return presetScenes.find(p => p.id === id);
};
