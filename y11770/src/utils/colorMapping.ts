import type { RatingLevel, AnomalyType } from '../types';
import { getMigrationDirection } from './ratingUtils';

export const getMigrationColor = (fromRating: RatingLevel, toRating: RatingLevel): string => {
  const direction = getMigrationDirection(fromRating, toRating);
  const colors: Record<number, string> = {
    [-3]: '#10b981',
    [-2]: '#34d399',
    [-1]: '#6ee7b7',
    [0]: '#60a5fa',
    [1]: '#fbbf24',
    [2]: '#f97316',
    [3]: '#ef4444',
  };

  if (direction <= -4) return '#059669';
  if (direction >= 4) return '#dc2626';

  return colors[direction] || '#6b7280';
};

export const getAnomalyColor = (type: AnomalyType, severity: 'warning' | 'error'): string => {
  if (severity === 'error') return '#dc2626';
  
  const warningColors: Record<AnomalyType, string> = {
    LOW_SAMPLE: '#fbbf24',
    DUPLICATE_BALANCE: '#a855f7',
    INVALID_FILTER: '#f97316',
    NEGATIVE_BALANCE: '#ef4444',
    INVALID_MIGRATION_COUNT: '#f97316',
    MISSING_INDUSTRY: '#6b7280',
  };
  
  return warningColors[type] || '#fbbf24';
};

export const getBalanceGradientColor = (balance: number, maxBalance: number): string => {
  const ratio = Math.min(balance / maxBalance, 1);
  const hue = 270 - ratio * 135;
  return `hsl(${hue}, 70%, 50%)`;
};

export const calculateCubeScale = (
  count: number,
  totalBalance: number,
  balanceWeightEnabled: boolean,
  maxCount: number,
  maxBalance: number
): number => {
  const countFactor = count / maxCount;

  if (!balanceWeightEnabled) {
    return 0.3 + countFactor * 0.7;
  }

  const balanceFactor = maxBalance > 0 ? totalBalance / maxBalance : 0;
  const weightedFactor = countFactor * 0.6 + balanceFactor * 0.4;
  return 0.3 + weightedFactor * 0.7;
};
