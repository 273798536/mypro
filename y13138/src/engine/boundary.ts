import type { MarkovNode, ParamRow, BoundaryCheckResult, OverflowCheckResult } from '@/types';

export function detectBoundaryIssues(
  nodes: MarkovNode[],
  paramRows: ParamRow[],
  explicitThreshold?: number,
): BoundaryCheckResult[] {
  const thresholdParam = paramRows.find((r) => r.id === 'P-07');
  const threshold = explicitThreshold !== undefined ? explicitThreshold : thresholdParam ? thresholdParam.value : 5;
  const thresholdUsed = explicitThreshold !== undefined ? '（滑块值）' : '（参数表P-07行）';
  const sourceText =
    explicitThreshold !== undefined
      ? `见参数表P-07行原文+滑块修改：当前θ=${threshold} — "有效样本低于此值时，外推结果不可靠"`
      : '见参数表P-07行原文："有效样本低于此值时，外推结果不可靠"';

  return nodes.map((node) => {
    const isAbnormal = node.sampleCount < threshold;
    const reason = isAbnormal
      ? `节点${node.romanLabel}(${node.displayName})边界样本=${node.sampleCount} < 阈值θ=${threshold}${thresholdUsed}（${sourceText}）`
      : `节点${node.romanLabel}样本充足n=${node.sampleCount} ≥ θ=${threshold}${thresholdUsed}`;
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
  explicitSafeCoeff?: number,
): OverflowCheckResult {
  const k = explicitSafeCoeff !== undefined ? explicitSafeCoeff : safeLimitParam ? safeLimitParam.value : 1.0;
  const limit = k * 1.0;
  const coeffTag =
    explicitSafeCoeff !== undefined
      ? `（滑块值k=${k}）`
      : safeLimitParam
      ? `（参数表P-08行k=${k}）`
      : `（默认k=1.0）`;
  const sourceText =
    explicitSafeCoeff !== undefined
      ? `见参数表P-08行原文+滑块修改：当前k=${k} — "概率超过k×1.0视为外推越界"`
      : '见参数表P-08行原文："概率超过k×1.0视为外推越界"';

  for (let i = 0; i < trajectoryDistribution.length; i++) {
    const p = trajectoryDistribution[i];
    if (p > limit + 1e-6) {
      return {
        hasOverflow: true,
        stepIndex: i,
        probability: p,
        safeLimit: limit,
        note: `节点S${i}外推概率=${p.toFixed(4)} > 理论上界k×1.0=${limit.toFixed(3)}${coeffTag}（${sourceText}）`,
      };
    }
    if (p < -1e-6) {
      return {
        hasOverflow: true,
        stepIndex: i,
        probability: p,
        safeLimit: 0,
        note: `节点S${i}外推概率=${p.toFixed(4)} < 0，违反概率非负公理${coeffTag}（根因：边界样本不足导致矩阵病态）`,
      };
    }
  }
  return {
    hasOverflow: false,
    stepIndex: -1,
    probability: 0,
    safeLimit: limit,
    note: `所有节点外推概率均在[0, ${limit.toFixed(3)}]范围内${coeffTag}`,
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
