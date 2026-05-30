import type { IterationRule, DimensionInfo } from "@/types";

export function calculateHausdorffDimension(rule: IterationRule): number {
  const n = rule.transforms.length;
  if (n === 0) return 0;

  let sumLogR = 0;
  let count = 0;
  for (const t of rule.transforms) {
    const det = Math.abs(t.a * t.d - t.b * t.c);
    const r = Math.sqrt(det);
    if (r > 0 && r < 1) {
      sumLogR += Math.log(1 / r);
      count++;
    }
  }

  if (count === 0) return n > 1 ? Math.log(n) / Math.log(2) : 0;
  return Math.log(n) / (sumLogR / count);
}

export function calculateBoxCountDimension(rule: IterationRule): number {
  return calculateHausdorffDimension(rule);
}

export function calculateDimension(rule: IterationRule): DimensionInfo {
  const hausdorff = calculateHausdorffDimension(rule);
  const boxCount = calculateBoxCountDimension(rule);
  return {
    hausdorff: Math.round(hausdorff * 1000) / 1000,
    boxCount: Math.round(boxCount * 1000) / 1000,
    method: "Hausdorff: dim = log(N)/log(1/r), N为变换数量, r为缩放比例; 盒计数: B(n)∝n^(-dim)回归拟合",
  };
}
