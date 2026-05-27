import type { Vector2 } from './types';

export const GAME_CONFIG = {
  PHYSICS: {
    COULOMB_CONSTANT: 5000,
    BALL_MASS: 1,
    FRICTION: 0.995,
    MAX_VELOCITY: 500,
    MIN_VELOCITY: 0.1,
    TIME_STEP: 1 / 60,
    MAX_FIELD_STRENGTH: 50000,
    FIELD_WARNING_THRESHOLD: 30000,
    SINGULARITY_RADIUS: 15,
  },

  ENERGY: {
    CHARGE_PLACE_COST: 10,
    CHARGE_DELETE_REFUND: 8,
    STRENGTH_MULTIPLIER: 1.5,
  },

  RENDERING: {
    TRAIL_LENGTH: 50,
    FIELD_LINE_COUNT: 12,
    FIELD_LINE_STEP: 8,
    FIELD_LINE_MAX_LENGTH: 200,
    GRID_SIZE: 40,
  },

  PREVIEW: {
    MAX_STEPS: 500,
    STEP_SIZE: 2,
    COLLISION_CHECK_STEPS: 5,
  },

  SCORING: {
    TIME_WEIGHT: 40,
    ENERGY_WEIGHT: 30,
    EFFICIENCY_WEIGHT: 30,
    STAR_THRESHOLDS: [0, 60, 80],
  },

  COLORS: {
    POSITIVE_CHARGE: '#ff006e',
    NEGATIVE_CHARGE: '#00f5d4',
    BALL: '#ffbe0b',
    WALL: '#1a2255',
    START: '#06d6a0',
    END: '#ff006e',
    OBSTACLE: '#7b2cbf',
    TRAIL: 'rgba(255, 190, 11, 0.6)',
    FIELD_LINE_POSITIVE: 'rgba(255, 0, 110, 0.4)',
    FIELD_LINE_NEGATIVE: 'rgba(0, 245, 212, 0.4)',
    WARNING: '#fb5607',
  },
} as const;

export const INITIAL_BALL_RADIUS = 8;

export const ENERGY_BAR_COLORS = {
  HIGH: '#06d6a0',
  MEDIUM: '#ffbe0b',
  LOW: '#ff006e',
};

export const getEnergyBarColor = (ratio: number): string => {
  if (ratio > 0.6) return ENERGY_BAR_COLORS.HIGH;
  if (ratio > 0.3) return ENERGY_BAR_COLORS.MEDIUM;
  return ENERGY_BAR_COLORS.LOW;
};

export const FAIL_REASON_MESSAGES: Record<string, string> = {
  collision: '小球碰撞到障碍物',
  timeout: '游戏超时',
  no_energy: '能量耗尽',
  path_wall: '预测路径穿墙',
  field_too_strong: '电场强度过高',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#06d6a0',
  medium: '#ffbe0b',
  hard: '#ff006e',
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const cloneVector = (v: Vector2): Vector2 => ({ x: v.x, y: v.y });

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
