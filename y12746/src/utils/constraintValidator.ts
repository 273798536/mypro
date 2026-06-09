import { Batch, ConstraintResult } from "@/types";

export function validateConstraints(batch: Batch): ConstraintResult[] {
  const results: ConstraintResult[] = [];
  const totalVolume = batch.totalApproxVolume ?? 0;
  const materials = batch.materials;
  const anomalies = batch.anomalies ?? [];
  const draftGaps = batch.draftGaps ?? [];

  results.push({
    id: "c1",
    constraintName: "总体积 ≤ 运输配额",
    passed: totalVolume <= batch.params.transportQuota,
    value: totalVolume,
    threshold: batch.params.transportQuota,
    unit: "cm³",
  });

  const maxErrorRate = materials.reduce<number>((max, m) => {
    if (m.errorRate === undefined || m.errorRate === null) return max;
    return Math.max(max, m.errorRate);
  }, 0);

  results.push({
    id: "c2",
    constraintName: "单条最大误差率",
    passed: maxErrorRate <= batch.params.errorThreshold,
    value: Number(maxErrorRate.toFixed(2)),
    threshold: batch.params.errorThreshold,
    unit: "%",
  });

  const gapRate = materials.length > 0
    ? Number((draftGaps.length / materials.length * 100).toFixed(2))
    : 0;

  results.push({
    id: "c3",
    constraintName: "草稿缺口率",
    passed: gapRate <= 10,
    value: gapRate,
    threshold: 10,
    unit: "%",
  });

  results.push({
    id: "c4",
    constraintName: "异常条数上限",
    passed: anomalies.length <= 3,
    value: anomalies.length,
    threshold: 3,
    unit: "条",
  });

  return results;
}
