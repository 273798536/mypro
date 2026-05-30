import type { ParamGuardRule } from "@/types";

export const paramGuardRules: ParamGuardRule[] = [
  {
    paramPath: "iterationRule.maxIterations",
    min: 1,
    max: 15,
    description: "迭代次数上限为15，超过将触发迭代爆炸检测。Hausdorff维度计算公式：dim = log(N)/log(1/r)，其中N为变换数量，r为缩放比例。",
    source: "paramGuards.ts — 统一来源",
  },
  {
    paramPath: "iterationRule.transforms[].probability",
    min: 0.01,
    max: 1.0,
    description: "每个变换的概率权重必须在(0,1]区间，所有变换概率之和应为1。",
    source: "paramGuards.ts — 统一来源",
  },
  {
    paramPath: "iterationRule.transforms[].scaleFactor",
    min: 0,
    max: 1,
    description: "变换矩阵的缩放因子（√(ad-bc)的绝对值）必须在[0,1]区间，否则分形将不收敛。盒计数维度通过B(n)∝n^(-dim)回归拟合。",
    source: "paramGuards.ts — 统一来源",
  },
  {
    paramPath: "iterationRule.colorScheme.layerOpacity",
    min: 0.05,
    max: 1.0,
    description: "图层透明度下限0.05防止完全不可见，上限1.0。颜色重叠检测阈值：同层RGB差值<30或跨层叠加后色差<15视为重叠。",
    source: "paramGuards.ts — 统一来源",
  },
  {
    paramPath: "iterationRule.colorScheme.colors[]",
    pattern: "^#[0-9a-fA-F]{6}$",
    description: "颜色值必须为标准HEX格式（#RRGGBB），便于颜色重叠检测时进行RGB分解和差值计算。",
    source: "paramGuards.ts — 统一来源",
  },
  {
    paramPath: "initialShape.vertices",
    min: 1,
    max: 1000,
    description: "初始图形顶点数应在1-1000范围内。顶点数量影响迭代后图元总数，需配合迭代次数共同控制。",
    source: "paramGuards.ts — 统一来源",
  },
];

export function getGuardByPath(paramPath: string): ParamGuardRule | undefined {
  return paramGuardRules.find((r) => r.paramPath === paramPath);
}

export function getDimensionMethodDescription(): string {
  const rule = paramGuardRules.find(
    (r) => r.paramPath === "iterationRule.maxIterations"
  );
  return rule?.description ?? "";
}

export function getColorOverlapThreshold(): { sameLayer: number; crossLayer: number } {
  return { sameLayer: 30, crossLayer: 15 };
}

export function getIterationExplosionThreshold(): { maxPrimitives: number; maxDepth: number } {
  return { maxPrimitives: 100000, maxDepth: 15 };
}
