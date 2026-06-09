import { Matrix, EPSILON } from './matrix';
import { svd } from './svd';
import type { RankResult, DegradationLevel } from '@/types';

export function computeRank(A: Matrix): RankResult {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  if (m === 0 || n === 0) {
    return {
      rank: 0,
      singularValues: [],
      conditionNumber: 0,
      tolerance: 0,
      errorEstimate: 0,
      maxRank: 0,
      degradationLevel: 'none',
    };
  }

  const { S } = svd(A);
  const sorted = [...S].sort((a, b) => b - a);
  const sigmaMax = sorted[0] ?? 0;
  const sigmaMin = sorted[sorted.length - 1] ?? 0;

  const maxRank = Math.min(m, n);
  const tolerance = Math.max(m, n) * sigmaMax * EPSILON;

  let rank = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] > tolerance) rank++;
    else break;
  }

  const conditionNumber = sigmaMin > 0 ? sigmaMax / sigmaMin : sigmaMax > 0 ? Infinity : 0;
  const errorEstimate = isFinite(conditionNumber) ? conditionNumber * EPSILON : 1;

  let degradationLevel: DegradationLevel = 'none';
  if (rank < maxRank) {
    const ratio = rank / maxRank;
    if (ratio >= 0.85) degradationLevel = 'mild';
    else if (ratio >= 0.6) degradationLevel = 'moderate';
    else degradationLevel = 'severe';
  } else if (isFinite(conditionNumber) && conditionNumber > 1e10) {
    degradationLevel = 'mild';
  } else if (isFinite(conditionNumber) && conditionNumber > 1e12) {
    degradationLevel = 'moderate';
  }

  return {
    rank,
    singularValues: sorted,
    conditionNumber,
    tolerance,
    errorEstimate,
    maxRank,
    degradationLevel,
  };
}

export function formatConditionNumber(k: number): string {
  if (!isFinite(k)) return '∞ (奇异)';
  if (k < 1e3) return k.toFixed(2);
  if (k < 1e6) return k.toExponential(2);
  return k.toExponential(2);
}

export function formatError(e: number): string {
  if (e >= 1) return '极高';
  if (e >= 1e-6) return e.toExponential(2);
  return `< ${(1e-6).toExponential(0)}`;
}

export function stabilityFromCondition(k: number): { label: string; level: 'good' | 'ok' | 'warn' | 'bad' } {
  if (!isFinite(k)) return { label: '奇异矩阵', level: 'bad' };
  if (k < 1e4) return { label: '稳定', level: 'good' };
  if (k < 1e8) return { label: '较稳定', level: 'ok' };
  if (k < 1e12) return { label: '接近奇异', level: 'warn' };
  return { label: '高度病态', level: 'bad' };
}

export const DEGRADATION_LABEL: Record<DegradationLevel, string> = {
  none: '无退化',
  mild: '轻度退化',
  moderate: '中度退化',
  severe: '严重退化',
};
