import type { CashFlow } from '@/types';

export function calculateDuration(
  cashFlows: CashFlow[],
  yieldRate: number
): number {
  const y = yieldRate / 100;
  let totalPV = 0;
  let weightedSum = 0;

  for (const cf of cashFlows) {
    const pv = cf.amount / Math.pow(1 + y, cf.period);
    totalPV += pv;
    weightedSum += pv * cf.period;
  }

  if (totalPV === 0) return 0;
  return weightedSum / totalPV;
}

export function calculateBondPriceChange(
  duration: number,
  yieldChange: number
): number {
  return -duration * yieldChange;
}

export function estimateDurationFromCashFlows(
  cashFlows: CashFlow[]
): number {
  const totalAmount = cashFlows.reduce((sum, cf) => sum + cf.amount, 0);
  if (totalAmount === 0) return 0;

  let weightedSum = 0;
  for (const cf of cashFlows) {
    const weight = cf.amount / totalAmount;
    weightedSum += weight * cf.period;
  }

  return weightedSum;
}

export function generateCashFlowWeights(cashFlows: CashFlow[]): number[] {
  return cashFlows.map(cf => cf.weight);
}

export function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 1 / weights.length);
  return weights.map(w => w / sum * 100);
}

export function calculateCashFlowDeviation(
  estimatedWeights: number[],
  actualWeights: number[]
): number[] {
  return estimatedWeights.map((ew, i) => {
    const aw = actualWeights[i] || 0;
    return Math.abs(ew - aw);
  });
}

export function getDurationCategory(duration: number): 'short' | 'medium' | 'long' {
  if (duration < 2) return 'short';
  if (duration < 6) return 'medium';
  return 'long';
}
