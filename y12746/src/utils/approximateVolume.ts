import { Material, BatchParams, CalculationResult, CalculationStep } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  length: "长",
  width: "宽",
  height: "高",
  quantity: "数量",
};

export function approximateVolume(
  material: Material,
  params: BatchParams
): CalculationResult {
  const steps: CalculationStep[] = [];
  const requiredFields: (keyof Material)[] = ["length", "width", "height", "quantity"];

  for (const field of requiredFields) {
    if (material[field] === null || material[field] === undefined) {
      return {
        approxVolume: 0,
        errorRate: null,
        steps,
        hasGap: true,
        gapField: field as string,
        anomalyType: "draft_gap",
        anomalyMessage: `缺少 ${FIELD_LABELS[field]} 字段，暂无法计算`,
      };
    }
  }

  const length = material.length as number;
  const width = material.width as number;
  const height = material.height as number;
  const quantity = material.quantity as number;

  if (
    typeof length !== "number" || isNaN(length) || length < 0 ||
    typeof width !== "number" || isNaN(width) || width < 0 ||
    typeof height !== "number" || isNaN(height) || height < 0 ||
    typeof quantity !== "number" || isNaN(quantity)
  ) {
    steps.push({ label: "字段有效性校验", value: "失败", note: "存在非数值或负数" });
    return {
      approxVolume: 0,
      errorRate: null,
      steps,
      hasGap: false,
      anomalyType: "bad_data",
      anomalyMessage: "材料尺寸或数量包含非法数值（非数字或负数）",
    };
  }

  steps.push({ label: "长 (L)", value: length, note: "cm" });
  steps.push({ label: "宽 (W)", value: width, note: "cm" });
  steps.push({ label: "高 (H)", value: height, note: "cm" });
  steps.push({ label: "数量 (Q)", value: quantity, note: "件" });

  const rawVolume = length * width * height * quantity;
  steps.push({ label: "材料总体积 L×W×H×Q", value: rawVolume, note: "cm³" });

  if (quantity === 0) {
    steps.push({ label: "空集合判定", value: "数量为 0", note: "跳过后续填充计算" });
    const errorRate = material.realVolume && material.realVolume > 0
      ? 0
      : 0;
    return {
      approxVolume: 0,
      errorRate,
      steps,
      hasGap: false,
      anomalyType: "empty_set",
      anomalyMessage: "数量为 0，空集合，近似体积记为 0",
    };
  }

  let fillRate = params.fillRate;
  if (fillRate <= 0) {
    steps.push({ label: "填充率校验", value: fillRate, note: "≤0，已兜底至默认值 0.8" });
    fillRate = 0.8;
  } else {
    steps.push({ label: "填充率 (FR)", value: fillRate });
  }

  const adjustedVolume = rawVolume / fillRate;
  steps.push({ label: "填充后体积 V/FR", value: Number(adjustedVolume.toFixed(2)), note: "cm³" });

  const boxVolume = params.boxVolume > 0 ? params.boxVolume : 80000;
  steps.push({ label: "单箱基准体积 (BV)", value: boxVolume, note: "cm³" });

  const rawBoxCount = adjustedVolume / boxVolume;
  steps.push({ label: "未取整箱数", value: Number(rawBoxCount.toFixed(3)) });

  let boxCount: number;
  switch (params.roundingRule) {
    case "floor":
      boxCount = Math.floor(rawBoxCount);
      break;
    case "round":
      boxCount = Math.round(rawBoxCount);
      break;
    case "ceil":
    default:
      boxCount = Math.ceil(rawBoxCount);
  }
  steps.push({ label: `取整后箱数（${params.roundingRule}）`, value: boxCount });

  const approxVolume = Math.max(boxCount, 1) * boxVolume;
  steps.push({ label: "近似总体积", value: approxVolume, note: "cm³" });

  let errorRate: number | null = null;
  if (material.realVolume !== null && material.realVolume > 0) {
    errorRate = Number((Math.abs(approxVolume - material.realVolume) / material.realVolume * 100).toFixed(2));
    steps.push({ label: "误差率", value: `${errorRate}%` });
  }

  return {
    approxVolume,
    errorRate,
    steps,
    hasGap: false,
    anomalyType: params.fillRate <= 0 ? "zero_division" : undefined,
    anomalyMessage: params.fillRate <= 0 ? "填充率为 0，已启用默认值 0.8 兜底计算" : undefined,
  };
}
