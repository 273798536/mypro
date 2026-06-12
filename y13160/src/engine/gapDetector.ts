import type { ChainStep, GapReport, ParamGroup } from '@/types';

export function scanGaps(steps: ChainStep[], group: ParamGroup): GapReport[] {
  const reports: GapReport[] = [];

  const requiredKeys = ['Hs_raw', 'T_raw', 'a_raw', 'water_depth', 'rho'];
  requiredKeys.forEach((k) => {
    const p = group.params[k];
    if (!p || Number.isNaN(p.value) || p.value === 0) {
      reports.push({
        stepId: steps[0]?.id ?? 'init',
        type: 'missing',
        description: `参数组「${group.name}」缺少关键参数: ${k}`,
        impact: '影响后续所有依赖该参数的步骤，结果不可信。',
      });
    }
  });

  steps.forEach((s) => {
    if (Number.isNaN(s.result.value) || !Number.isFinite(s.result.value)) {
      reports.push({
        stepId: s.id,
        type: 'missing',
        description: `${s.title} 计算结果为非数值`,
        impact: s.gapReason ?? '后续步骤链路断裂。',
      });
    }
    if (s.hasGap) {
      reports.push({
        stepId: s.id,
        type: s.gapReason?.includes('超量程') ? 'out_of_range' : 'unit_mismatch',
        description: s.gapReason ?? `${s.title} 存在未定义缺口`,
        impact: `该步数量级可信度下降，建议撤回至前一节点重新采样。`,
      });
    }
  });

  return reports;
}

export function markGapStep(
  steps: ChainStep[],
  stepIndex: number,
  reason: string
): ChainStep[] {
  return steps.map((s, idx) =>
    idx === stepIndex ? { ...s, hasGap: true, gapReason: reason } : s
  );
}
