import { Difficulty, DifficultyConfig } from './types';

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    name: '新手',
    baseVolatility: 0.005,
    eventFrequency: 0.008,
    feeRate: 0.0005,
    inventoryPenaltyCoeff: 0.1,
    targetScore: 1000,
    gameDuration: 180,
  },
  intermediate: {
    name: '进阶',
    baseVolatility: 0.01,
    eventFrequency: 0.015,
    feeRate: 0.001,
    inventoryPenaltyCoeff: 0.3,
    targetScore: 3000,
    gameDuration: 240,
  },
  expert: {
    name: '专家',
    baseVolatility: 0.02,
    eventFrequency: 0.025,
    feeRate: 0.0015,
    inventoryPenaltyCoeff: 0.5,
    targetScore: 8000,
    gameDuration: 300,
  },
  hell: {
    name: '地狱',
    baseVolatility: 0.035,
    eventFrequency: 0.04,
    feeRate: 0.002,
    inventoryPenaltyCoeff: 1.0,
    targetScore: 20000,
    gameDuration: 300,
  },
};

export const GAME_CONFIG = {
  INITIAL_PRICE: 100,
  INITIAL_CASH: 10000,
  INVENTORY_THRESHOLD: 10,
  MAX_ORDERS_PER_SIDE: 3,
  ORDER_QUANTITY: 5,
  TICK_SIZE: 0.01,
  ORDER_BOOK_DEPTH: 8,
  SNAPSHOT_INTERVAL: 100,
  FORCE_LIQUIDATION_THRESHOLD: -5000,
};

export const EVENT_TEMPLATES = [
  {
    type: 'price_jump' as const,
    severity: 'critical' as const,
    messages: ['重大利好！', '重大利空！'],
    duration: 0,
    effectBuilder: () => ({
      priceChange: (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.02) * 100,
    }),
  },
  {
    type: 'liquidity_crisis' as const,
    severity: 'warning' as const,
    messages: ['流动性枯竭！'],
    duration: 10000,
    effectBuilder: () => ({
      depthMultiplier: 0.5,
    }),
  },
  {
    type: 'fee_change' as const,
    severity: 'info' as const,
    messages: ['手续费临时上调！'],
    duration: 15000,
    effectBuilder: () => ({
      feeMultiplier: 2,
    }),
  },
  {
    type: 'volatility_spike' as const,
    severity: 'warning' as const,
    messages: ['波动率急剧上升！'],
    duration: 20000,
    effectBuilder: () => ({
      volatilityMultiplier: 2,
    }),
  },
];
