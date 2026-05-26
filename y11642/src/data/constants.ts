import { Weather } from '../types';

export const BOARD_SIZE = 6;
export const MAX_ROUNDS = 8;
export const WATER_PER_UNIT = 10;
export const BASE_SCORE_PER_PLOT = 100;
export const DROUGHT_PENALTY = 50;
export const OVERWATER_PENALTY = 30;
export const EVAPORATION_PENALTY = 10;

export const WEATHER_TYPES: Record<string, Weather> = {
  sunny: {
    type: 'sunny',
    evaporationRate: 0.3,
    description: '晴天，蒸发量大',
    icon: '☀️'
  },
  cloudy: {
    type: 'cloudy',
    evaporationRate: 0.1,
    description: '多云，蒸发量适中',
    icon: '⛅'
  },
  rainy: {
    type: 'rainy',
    evaporationRate: 0,
    description: '雨天，无需灌溉',
    icon: '🌧️'
  },
  windy: {
    type: 'windy',
    evaporationRate: 0.2,
    description: '大风，蒸发量较大',
    icon: '💨'
  }
};

export const CROP_TYPES = [
  { name: '小麦', waterRequired: 20, icon: '🌾' },
  { name: '玉米', waterRequired: 25, icon: '🌽' },
  { name: '水稻', waterRequired: 35, icon: '🍚' },
  { name: '蔬菜', waterRequired: 30, icon: '🥬' }
];

export const CELL_COLORS = {
  source: '#1E88E5',
  canal: '#81D4FA',
  valve: '#FF9800',
  plot: '#81C784',
  empty: '#EFEBE9'
};
