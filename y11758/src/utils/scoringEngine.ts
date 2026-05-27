import { Anomaly, ScoringResult } from '@/types';
import { WRONG_MARK_PENALTY, TIME_BONUS_PER_10_SECONDS, GRADE_THRESHOLDS } from '@/config/levels';

export function calculateScore(
  correctDetections: Anomaly[],
  wrongMarks: Anomaly[],
  totalAnomalies: number,
  timeRemaining: number,
  usedTime: number
): ScoringResult {
  const correctScore = correctDetections.reduce((sum, a) => sum + a.scoreDelta, 0);
  const penaltyScore = wrongMarks.length * WRONG_MARK_PENALTY;
  const timeBonus = Math.floor(timeRemaining / 10) * TIME_BONUS_PER_10_SECONDS;

  const maxPossibleScore = 100;
  const totalScore = Math.min(Math.max(correctScore - penaltyScore + timeBonus, 0), maxPossibleScore);

  const grade = GRADE_THRESHOLDS.find(t => totalScore >= t.minScore)?.grade || 'D';

  return {
    totalScore,
    correctDetections: correctDetections.length,
    wrongMarks: wrongMarks.length,
    missedAnomalies: totalAnomalies - correctDetections.length,
    timeBonus,
    grade,
  };
}

export function getAnomalyTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    duplicate_invoice: '同票重复',
    mismatch_chain: '上下游不匹配',
    delayed_payment: '付款滞后',
    amount_anomaly: '金额异常',
  };
  return typeMap[type] || type;
}

export function getSeverityName(severity: string): string {
  const severityMap: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  return severityMap[severity] || severity;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
