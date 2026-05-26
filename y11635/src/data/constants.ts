export const RESERVOIR_CAPACITY = 100;
export const SAFE_LEVEL = 70;
export const WARNING_LINE = 80;
export const OVERFLOW_LINE = 90;
export const DAM_BREAK_LEVEL = 100;
export const LOW_STORAGE_LEVEL = 30;

export const MAX_ROUNDS = 12;

export const COLORS = {
  deepSea: '#1a365d',
  waterBlue: '#4299e1',
  storageBlue: '#63b3ed',
  alertOrange: '#ed8936',
  safeGreen: '#48bb78',
  dangerRed: '#f56565',
  warningYellow: '#ecc94b',
  darkBg: '#0f2544',
  panelBg: '#1a365d',
  borderColor: '#2d4a6f',
  textPrimary: '#e2e8f0',
  textSecondary: '#a0aec0',
  textMuted: '#718096',
} as const;

export const WEATHER_CARDS = [
  {
    type: 'sunny',
    name: '晴天',
    inflowMin: 2,
    inflowMax: 5,
    color: '#f6ad55',
    icon: 'Sun',
    description: '上游来水较少，可适度蓄水',
  },
  {
    type: 'lightRain',
    name: '小雨',
    inflowMin: 5,
    inflowMax: 10,
    color: '#90cdf4',
    icon: 'CloudRain',
    description: '上游来水适中，维持正常调度',
  },
  {
    type: 'moderateRain',
    name: '中雨',
    inflowMin: 10,
    inflowMax: 18,
    color: '#63b3ed',
    icon: 'CloudDrizzle',
    description: '上游来水增加，需关注水位变化',
  },
  {
    type: 'heavyRain',
    name: '大雨',
    inflowMin: 18,
    inflowMax: 30,
    color: '#4299e1',
    icon: 'CloudLightning',
    description: '上游来水较大，可能需要开闸泄洪',
  },
  {
    type: 'storm',
    name: '暴雨',
    inflowMin: 30,
    inflowMax: 45,
    color: '#2b6cb0',
    icon: 'CloudFog',
    description: '上游来水巨大，必须立即开闸泄洪！',
  },
] as const;

export const SCORE_RULES = {
  safeOperation: 10,
  timelyWarning: 15,
  delayedWarning: -20,
  excessiveGate: -10,
  lowStorage: -5,
  overflowLoss: -30,
} as const;

export const GATE_FLOW_RATE = 0.4;

export const INITIAL_RESERVOIR_LEVEL = 40;
