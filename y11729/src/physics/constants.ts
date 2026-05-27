import type { SimulationParams, CalculationFormula } from './types';

export const GRAVITY = 9.81;

export const AIR_DENSITY = 1.225;

export const DEFAULT_PARAMS: SimulationParams = {
  initialVelocity: 60,
  launchAngle: 45,
  dragCoefficient: 0.5,
  arrowMass: 20,
  targetDistance: 70,
  timeStep: 0.01,
  arrowDiameter: 0.006,
};

export const PARAM_LIMITS = {
  initialVelocity: { min: 10, max: 150, step: 1 },
  launchAngle: { min: 0, max: 90, step: 1 },
  dragCoefficient: { min: 0, max: 2, step: 0.05 },
  arrowMass: { min: 10, max: 100, step: 1 },
  targetDistance: { min: 10, max: 200, step: 1 },
  timeStep: { min: 0.001, max: 0.1, step: 0.001 },
  arrowDiameter: { min: 0.004, max: 0.01, step: 0.001 },
};

export const CALCULATION_FORMULAS: CalculationFormula[] = [
  {
    name: '无空气阻力 - 水平位置',
    formula: 'x(t) = v₀ · cos(θ) · t',
    description: '水平方向匀速直线运动',
  },
  {
    name: '无空气阻力 - 垂直位置',
    formula: 'y(t) = v₀ · sin(θ) · t - ½ g t²',
    description: '垂直方向匀加速运动，受重力影响',
  },
  {
    name: '空气阻力大小',
    formula: 'Fd = ½ ρ v² Cd A',
    description: 'ρ=空气密度, v=速度, Cd=阻力系数, A=横截面积',
  },
  {
    name: '4阶龙格-库塔法',
    formula: 'k₁ = f(t, y), k₂ = f(t+h/2, y+hk₁/2), k₃ = f(t+h/2, y+hk₂/2), k₄ = f(t+h, y+hk₃)',
    description: 'y(t+h) = y(t) + h(k₁+2k₂+2k₃+k₄)/6',
  },
];

export const COLORS = {
  noDrag: '#22C55E',
  withDrag: '#F97316',
  target: '#EF4444',
  grid: '#374151',
  background: '#1A1A2E',
};

export const STORAGE_KEYS = {
  HISTORY: 'trajectory_history',
  PREFERENCES: 'trajectory_preferences',
};

export const MAX_HISTORY_ITEMS = 20;
