import type { MarkovNode, ParamRow, BoundaryCheckResult, OverflowCheckResult } from '@/types';

export function detectBoundaryIssues(
  nodes: MarkovNode[],
  paramRows: ParamRow[],
): BoundaryCheckResult[] {
  const thresholdParam = paramRows.find((r) => r.id === 'P-07');
  const threshold = thresholdParam ? thresholdParam.value : 5;

  return nodes.map((node) => {
    const isAbnormal = node.sampleCount < threshold;
    const reason = isAbnormal
      ? `节点${node.romanLabel}(${node.displayName})边界样本=${node.sampleCount} < 阈值θ=${threshold}（见参数表P-07行原文："有效样本低于此值时，外推结果不可靠"）`
      : `节点${node.romanLabel}样本充足n=${node.sampleCount} ≥ θ=${threshold}`;
    return {
      nodeId: node.id,
      isAbnormal,
      sampleCount: node.sampleCount,
      threshold,
      thresholdParamId: 'P-07',
      reason,
    };
  });
}

export function detectOverflow(
  trajectoryDistribution: number[],
  safeLimitParam: ParamRow | undefined,
): OverflowCheckResult {
  const k = safeLimitParam ? safeLimitParam.value : 1.0;
  const limit = k * 1.0;
  for (let i = 0; i < trajectoryDistribution.length; i++) {
    const p = trajectoryDistribution[i];
    if (p > limit + 1e-6) {
      return {
        hasOverflow: true,
        stepIndex: i,
        probability: p,
        safeLimit: limit,
        note: `节点S${i}外推概率=${p.toFixed(4)} > 理论上界k×1.0=${limit.toFixed(3)}（见参数表P-08行原文："概率超过k×1.0视为外推越界"）`,
      };
    }
    if (p < -1e-6) {
      return {
        hasOverflow: true,
        stepIndex: i,
        probability: p,
        safeLimit: 0,
        note: `节点S${i}外推概率=${p.toFixed(4)} < 0，违反概率非负公理（根因：边界样本不足导致矩阵病态）`,
      };
    }
  }
  return {
    hasOverflow: false,
    stepIndex: -1,
    probability: 0,
    safeLimit: limit,
    note: '所有节点外推概率均在[0, 1]范围内',
  };
}

export function buildAbnormalReasonText(
  check: BoundaryCheckResult,
  overflow?: OverflowCheckResult,
): string {
  if (!check.isAbnormal && overflow && !overflow.hasOverflow) return '';
  const parts: string[] = [];
  if (check.isAbnormal) parts.push(check.reason);
  if (overflow && overflow.hasOverflow) parts.push(overflow.note);
  return parts.join('；');
}
