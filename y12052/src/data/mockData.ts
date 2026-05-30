import type { RadarBlock, WarningLevel } from '@/types/game';

export const INITIAL_RADAR_BLOCKS: RadarBlock[] = [
  {
    id: 'cloud-1',
    type: 'cloud',
    position: { x: -1, y: 0 },
    targetPosition: { x: 1, y: 1 },
    isPlaced: false,
    isCorrect: null,
    dataSource: 'radar-a',
    color: '#60A5FA',
    label: '积雨云团',
  },
  {
    id: 'cloud-2',
    type: 'cloud',
    position: { x: -1, y: 1 },
    targetPosition: { x: 2, y: 0 },
    isPlaced: false,
    isCorrect: null,
    dataSource: 'radar-a',
    color: '#3B82F6',
    label: '层状云团',
  },
  {
    id: 'rain-1',
    type: 'rain',
    position: { x: -1, y: 2 },
    targetPosition: { x: 1, y: 2 },
    isPlaced: false,
    isCorrect: null,
    dataSource: 'radar-b',
    color: '#06B6D4',
    label: '强降雨区',
  },
  {
    id: 'storm-1',
    type: 'storm',
    position: { x: -1, y: 3 },
    targetPosition: { x: 2, y: 2 },
    isPlaced: false,
    isCorrect: null,
    dataSource: 'radar-b',
    color: '#F97316',
    label: '风暴中心',
  },
];

export const TARGET_WIND_DIRECTION = 135;

export const TARGET_WARNING_LEVEL: WarningLevel = 'orange';
export const TARGET_WARNING_TIME = 5;

export const GRID_SIZE = 3;
export const MAX_SCORE = 100;

export const WARNING_LEVELS: { level: WarningLevel; label: string; color: string }[] = [
  { level: 'none', label: '无预警', color: '#9CA3AF' },
  { level: 'blue', label: '蓝色预警', color: '#3B82F6' },
  { level: 'yellow', label: '黄色预警', color: '#EAB308' },
  { level: 'orange', label: '橙色预警', color: '#F97316' },
  { level: 'red', label: '红色预警', color: '#EF4444' },
];

export const RAINFALL_CALCULATION = `
雨量推演口径说明：

1. 云团类型判定：
   - 积雨云团：单次降雨量 20-40mm/h
   - 层状云团：单次降雨量 5-15mm/h

2. 风向影响系数：
   - 东南风(135°)：降雨增强系数 1.2
   - 西北风(315°)：降雨减弱系数 0.8
   - 偏差±30°内：系数线性变化

3. 预警级别标准：
   - 蓝色预警：预计12小时内降雨量达50mm以上
   - 黄色预警：预计6小时内降雨量达50mm以上
   - 橙色预警：预计3小时内降雨量达50mm以上
   - 红色预警：预计3小时内降雨量达100mm以上

4. 时间窗口计算：
   - 预警发布时机与预计降雨时间差±2小时为合理范围
`;

export const SCORING_RULES = {
  cloudPlacement: 40,
  windDirection: 30,
  warningLevel: 20,
  warningTime: 10,
};

export const ERROR_DEDUCTIONS = {
  'cloud-mismatch': { high: 15, medium: 8, low: 3 },
  'wind-reverse': { high: 20, medium: 10, low: 5 },
  'warning-early': { high: 8, medium: 4, low: 2 },
  'warning-late': { high: 8, medium: 4, low: 2 },
};
