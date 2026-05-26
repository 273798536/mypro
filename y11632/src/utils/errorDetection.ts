import type { BondCard, Slot, YieldCurve, ErrorRecord } from '@/types';
import { getDurationCategory } from './durationCalc';

export interface DetectionResult {
  hasError: boolean;
  errorType?: string;
  description?: string;
  suggestion?: string;
}

export function checkDurationMismatch(
  bond: BondCard,
  slot: Slot
): DetectionResult {
  const bondCategory = bond.category;
  const slotMin = slot.minDuration;
  const slotMax = slot.maxDuration;

  const bondInSlot = bond.duration >= slotMin && bond.duration < slotMax;

  if (!bondInSlot) {
    const correctCategory = getDurationCategory(bond.duration);
    let targetSlot = '';
    if (correctCategory === 'short') targetSlot = '短久期槽位 (0-2年)';
    else if (correctCategory === 'medium') targetSlot = '中久期槽位 (2-6年)';
    else targetSlot = '长久期槽位 (6-15年)';

    return {
      hasError: true,
      errorType: 'duration_mismatch',
      description: `久期不匹配：${bond.name}的久期为${bond.duration}年，属于${correctCategory === 'short' ? '短久期' : correctCategory === 'medium' ? '中久期' : '长久期'}债券，不应放入"${slot.label}"。`,
      suggestion: `请将该债券拖入${targetSlot}。`,
    };
  }

  return { hasError: false };
}

export function checkCurveDirection(
  curve: YieldCurve,
  expectedDirection: 'up' | 'down' | 'flat'
): DetectionResult {
  if (curve.direction !== expectedDirection) {
    let desc = '';
    let sugg = '';

    if (expectedDirection === 'up') {
      desc = '收益率曲线方向错误：预期曲线应向上平移（利率上升），但当前方向为' + (curve.direction === 'down' ? '下降' : '持平') + '。';
      sugg = '利率上升时，长久期债券价格跌幅更大，请调整曲线方向为向上平移。';
    } else if (expectedDirection === 'down') {
      desc = '收益率曲线方向错误：预期曲线应向下平移（利率下降），但当前方向为' + (curve.direction === 'up' ? '上升' : '持平') + '。';
      sugg = '利率下降时，长久期债券价格涨幅更大，请调整曲线方向为向下平移。';
    } else {
      desc = '收益率曲线方向错误：预期曲线应保持平稳，但当前方向为' + (curve.direction === 'up' ? '上升' : '下降') + '。';
      sugg = '当前市场利率稳定，请将曲线调整为平稳状态。';
    }

    return {
      hasError: true,
      errorType: 'curve_direction',
      description: desc,
      suggestion: sugg,
    };
  }

  return { hasError: false };
}

export function checkCashFlowWeight(
  bond: BondCard,
  estimatedWeights: number[]
): DetectionResult {
  const deviations = bond.cashFlows.map((cf, i) => {
    const estimated = estimatedWeights[i] || 0;
    return Math.abs(estimated - cf.weight);
  });

  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const maxDeviation = Math.max(...deviations);

  if (maxDeviation > 10) {
    const maxIndex = deviations.indexOf(maxDeviation);
    const actualWeight = bond.cashFlows[maxIndex].weight;
    const estimatedWeight = estimatedWeights[maxIndex] || 0;

    return {
      hasError: true,
      errorType: 'cashflow_weight',
      description: `现金流权重误判：第${maxIndex + 1}期现金流权重判断偏差较大。实际权重应为${actualWeight.toFixed(1)}%，当前判断为${estimatedWeight.toFixed(1)}%，偏差${(estimatedWeight - actualWeight).toFixed(1)}%。`,
      suggestion: '久期计算的核心是各期现金流的加权平均时间。前期利息的权重通常较小，本金偿还期的权重通常最大。',
    };
  }

  if (avgDeviation > 5) {
    return {
      hasError: true,
      errorType: 'cashflow_weight',
      description: `现金流权重判断偏差较大，平均偏差${avgDeviation.toFixed(1)}%。`,
      suggestion: '请重新审视各期现金流的相对大小。票面利息占比小、本金偿还占比大是典型模式。',
    };
  }

  return { hasError: false };
}

export function createErrorRecord(
  operationIndex: number,
  result: DetectionResult
): ErrorRecord {
  return {
    operationIndex,
    type: result.errorType || 'unknown',
    description: result.description || '操作错误',
    suggestion: result.suggestion || '请重新操作',
  };
}

export function countErrorTypes(errors: ErrorRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const err of errors) {
    counts[err.type] = (counts[err.type] || 0) + 1;
  }
  return counts;
}
