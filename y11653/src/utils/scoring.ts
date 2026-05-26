import type { WaterQuality, Thresholds, ScoreBreakdown, AnomalyType } from '@/types';

export function calculateScore(
  finalQuality: WaterQuality,
  thresholds: Thresholds,
  totalCost: number,
  operations: { anomalies: AnomalyType[] }[]
): ScoreBreakdown {
  const deductions: { reason: string; points: number }[] = [];
  const complianceMax = 50;
  const costMax = 30;
  const operationMax = 20;

  let complianceScore = complianceMax;
  const indicators: (keyof Omit<WaterQuality, 'ph'>)[] = ['cod', 'ammonia', 'totalPhosphorus', 'totalNitrogen', 'turbidity'];

  indicators.forEach((indicator) => {
    if (finalQuality[indicator] > thresholds[indicator]) {
      const excess = finalQuality[indicator] - thresholds[indicator];
      const percentage = excess / thresholds[indicator];
      const penalty = Math.min(10, Math.round(percentage * 10 + 5));
      complianceScore -= penalty;
      deductions.push({
        reason: `${indicator}超标 ${excess.toFixed(1)}`,
        points: -penalty,
      });
    }
  });

  if (finalQuality.ph < thresholds.ph[0] || finalQuality.ph > thresholds.ph[1]) {
    complianceScore -= 10;
    deductions.push({
      reason: `pH值超出范围 (${finalQuality.ph.toFixed(1)})`,
      points: -10,
    });
  }

  complianceScore = Math.max(0, complianceScore);

  const baseBudget = 5;
  const costScore = totalCost <= baseBudget ? costMax : Math.max(0, costMax - Math.round((totalCost - baseBudget) * 3));
  if (totalCost > baseBudget) {
    deductions.push({
      reason: `成本超支 ${(totalCost - baseBudget).toFixed(2)}元`,
      points: -(costMax - costScore),
    });
  }

  let operationScore = operationMax;
  operations.forEach((op) => {
    op.anomalies.forEach((anomaly) => {
      const penalty = anomaly === 'overdose' || anomaly === 'ph_extreme' ? 8 : 5;
      operationScore = Math.max(0, operationScore - penalty);
      deductions.push({
        reason: `操作异常: ${getAnomalyName(anomaly)}`,
        points: -penalty,
      });
    });
  });

  return {
    compliance: complianceScore,
    complianceMax,
    cost: costScore,
    costMax,
    operation: operationScore,
    operationMax,
    total: complianceScore + costScore + operationScore,
    totalMax: complianceMax + costMax + operationMax,
    deductions,
  };
}

function getAnomalyName(type: AnomalyType): string {
  const names: Record<AnomalyType, string> = {
    overdose: '投药过量',
    insufficient_mixing: '搅拌不足',
    rebound: '指标反弹',
    ph_extreme: 'pH异常',
  };
  return names[type];
}

export function getGrade(score: number, maxScore: number): { grade: string; color: string } {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return { grade: 'A', color: '#00B42A' };
  if (percentage >= 80) return { grade: 'B', color: '#165DFF' };
  if (percentage >= 70) return { grade: 'C', color: '#FF7D00' };
  if (percentage >= 60) return { grade: 'D', color: '#F53F3F' };
  return { grade: 'F', color: '#86909C' };
}
