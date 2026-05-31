import type { Collateral, Oracle } from './types';

export function calculateCollateralValue(
  collaterals: Collateral[],
  oracle: Oracle
): number {
  return collaterals.reduce((total, col) => {
    if (col.asset === oracle.asset) {
      return total + col.amount * oracle.price;
    }
    return total;
  }, 0);
}

export function calculateCollateralRatio(
  collateralValue: number,
  debtValue: number
): number {
  if (debtValue === 0) return Infinity;
  return (collateralValue / debtValue) * 100;
}

export function calculateDebtValue(
  debtAmount: number,
  debtAssetPrice: number
): number {
  return debtAmount * debtAssetPrice;
}

export function calculateGasCost(
  operationType: 'liquidation' | 'partial' | 'swap',
  baseGas: number,
  networkCongestion: number = 1
): number {
  const multipliers: Record<string, number> = {
    liquidation: 1.5,
    partial: 1.0,
    swap: 1.2,
  };
  return Math.floor(baseGas * (multipliers[operationType] || 1) * networkCongestion);
}

export function formatRatio(ratio: number): string {
  if (ratio === Infinity) return '∞';
  return ratio.toFixed(2) + '%';
}

export function formatValue(value: number, decimals: number = 2): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calculateScore(
  timeUsed: number,
  avgCollateralRatio: number,
  safetyRatio: number,
  success: boolean
): number {
  if (!success) return 0;
  const baseScore = 1000;
  const timePenalty = Math.min(timeUsed * 2, 500);
  const safetyBonus = Math.max(0, (avgCollateralRatio - safetyRatio) * 10);
  return Math.floor(baseScore - timePenalty + safetyBonus);
}
