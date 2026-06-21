import type { BoundaryResult, BoundaryType } from '@/types';

const EXPECTED_ZERO_CONTEXTS = new Set([
  'completed_tasks',
  'errors_resolved',
  'empty_slots',
]);

function isExpectedZero(value: number, context?: string): boolean {
  if (context && EXPECTED_ZERO_CONTEXTS.has(context)) {
    return true;
  }
  return false;
}

export function handleEmptySet(data: any[], context?: string): BoundaryResult {
  if (data.length === 0) {
    return {
      isBoundary: true,
      type: 'empty',
      valueBefore: null,
      valueAfter: null,
      explanation: context
        ? `${context}：输入集合为空，无法进行拓扑计算，已标记为边界异常。`
        : '输入集合为空，无法进行拓扑计算，已标记为边界异常。',
    };
  }
  return {
    isBoundary: false,
    explanation: '集合非空，正常处理。',
  };
}

export function handleZeroValue(
  value: number,
  threshold: number = 0,
  context?: string
): BoundaryResult {
  if (value === 0 && !isExpectedZero(value, context)) {
    return {
      isBoundary: true,
      type: 'zero',
      valueBefore: 0,
      valueAfter: null,
      explanation: context
        ? `${context}：出现非预期零值，可能是数据缺失或计算错误，需人工复核。`
        : '出现非预期零值，可能是数据缺失或计算错误，需人工复核。',
    };
  }
  return {
    isBoundary: false,
    explanation: '零值在预期范围内，正常处理。',
  };
}

export function handleExtrapolation(
  value: number,
  threshold: number,
  context?: string
): BoundaryResult {
  const lowerBound = threshold * 0.5;
  const upperBound = threshold * 1.5;

  if (value > upperBound || value < lowerBound) {
    const before = value;
    const after = Math.max(Math.min(value, upperBound), lowerBound);
    return {
      isBoundary: true,
      type: 'extrapolate',
      valueBefore: before,
      valueAfter: after,
      explanation: context
        ? `${context}：外推值 ${before} 超出阈值范围 [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]，已裁剪至 ${after.toFixed(2)}。`
        : `外推值 ${before} 超出阈值范围 [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]，已裁剪至 ${after.toFixed(2)}。`,
    };
  }
  return {
    isBoundary: false,
    explanation: '值在阈值范围内，正常处理。',
  };
}

export function processAllBoundaries(
  data: any[],
  value: number,
  threshold: number,
  context?: string
): BoundaryResult[] {
  const results: BoundaryResult[] = [];

  const emptyResult = handleEmptySet(data, context);
  results.push(emptyResult);

  if (!emptyResult.isBoundary) {
    const zeroResult = handleZeroValue(value, threshold, context);
    results.push(zeroResult);

    if (!zeroResult.isBoundary) {
      const extrapolateResult = handleExtrapolation(value, threshold, context);
      results.push(extrapolateResult);
    }
  }

  return results;
}

export function getBoundaryTypeLabel(type: BoundaryType): string {
  const labels: Record<BoundaryType, string> = {
    empty: '空集合',
    zero: '零值异常',
    extrapolate: '外推越界',
  };
  return labels[type];
}

export function getBoundaryTypeColor(type: BoundaryType): string {
  const colors: Record<BoundaryType, string> = {
    empty: '#f59e0b',
    zero: '#ef4444',
    extrapolate: '#8b5cf6',
  };
  return colors[type];
}
