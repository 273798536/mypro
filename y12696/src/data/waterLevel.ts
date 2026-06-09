import type { WaterLevelState } from '@/types';

export const initialWaterLevel: WaterLevelState = {
  currentLevel: 22.5,
  targetLevel: 27.8,
  maxLevel: 28.5,
  minLevel: 17.0,
  upstreamLevel: 27.8,
  downstreamLevel: 18.3,
  flowRate: 125.6,
};

export const waterLevelWarnings = [
  { level: 26.0, type: 'warning', message: '接近设计高水位，注意超灌风险' },
  { level: 18.5, type: 'warning', message: '接近设计低水位，注意抽干风险' },
];
