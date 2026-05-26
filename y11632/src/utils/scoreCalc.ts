import type { ErrorRecord } from '@/types';

export function calculateStars(score: number, targetScore: number): number {
  const ratio = score / targetScore;
  if (ratio >= 1) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

export function calculateDragScore(
  isCorrect: boolean,
  timeBonus: number
): number {
  if (!isCorrect) return -20;
  return 30 + timeBonus;
}

export function calculateCurveScore(
  isCorrect: boolean
): number {
  if (!isCorrect) return -30;
  return 50;
}

export function calculateCashFlowScore(
  deviation: number[],
  threshold: number = 5
): number {
  const avgDeviation = deviation.reduce((a, b) => a + b, 0) / deviation.length;

  if (avgDeviation < threshold / 2) return 40;
  if (avgDeviation < threshold) return 20;
  if (avgDeviation < threshold * 2) return 0;
  return -20;
}

export function formatScore(score: number): string {
  return score >= 0 ? `+${score}` : `${score}`;
}

export function getScoreColor(score: number): string {
  if (score > 0) return '#2ECC71';
  if (score < 0) return '#FF6B6B';
  return '#94A3B8';
}

export function calculateTotalScore(
  baseScore: number,
  errors: ErrorRecord[]
): number {
  const errorPenalty = errors.length * 10;
  return Math.max(0, baseScore - errorPenalty);
}

export function getScoreGrade(score: number, targetScore: number): string {
  const ratio = score / targetScore;
  if (ratio >= 1) return 'S';
  if (ratio >= 0.85) return 'A';
  if (ratio >= 0.7) return 'B';
  if (ratio >= 0.5) return 'C';
  return 'D';
}
