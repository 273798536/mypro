import type { CostSnapshot, ParameterDiff, ComparisonResult } from '@/types';

export const compareSnapshots = (a: CostSnapshot, b: CostSnapshot): ComparisonResult => {
  const totalCostDiff = b.totalCost - a.totalCost;
  const totalCostDiffPercent = (totalCostDiff / a.totalCost) * 100;

  const paramMapA = new Map(a.parameters.map(p => [p.name, p]));
  const paramMapB = new Map(b.parameters.map(p => [p.name, p]));

  const parameterDiffs: ParameterDiff[] = [];
  
  for (const [name, paramA] of paramMapA) {
    const paramB = paramMapB.get(name);
    if (paramB && paramA.value !== paramB.value) {
      const diff = paramB.value - paramA.value;
      const diffPercent = (diff / paramA.value) * 100;
      parameterDiffs.push({
        name,
        valueA: paramA.value,
        valueB: paramB.value,
        diff,
        diffPercent,
        unit: paramA.unit
      });
    }
  }

  const hasManualJudgmentChange = 
    (a.manualJudgment?.decision !== b.manualJudgment?.decision) ||
    (a.manualJudgment?.content !== b.manualJudgment?.content);

  return {
    totalCostDiff,
    totalCostDiffPercent,
    parameterDiffs,
    hasManualJudgmentChange
  };
};

export const formatDiff = (value: number, unit: string): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}${unit}`;
};

export const formatPercentDiff = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};
