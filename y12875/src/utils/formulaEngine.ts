import { BuoyRecord, WaterQualityWarning } from "@/types";

export interface WarningThresholds {
  plasticConcentration: number;
  turbidity: number;
  salinityMin: number;
  salinityMax: number;
  temperatureMax: number;
}

export const DEFAULT_THRESHOLDS: WarningThresholds = {
  plasticConcentration: 500,
  turbidity: 50,
  salinityMin: 28,
  salinityMax: 38,
  temperatureMax: 32,
};

function safeGet(
  record: BuoyRecord,
  field: keyof BuoyRecord
): number | null {
  const val = record[field];
  return typeof val === "number" ? val : null;
}

export function calculateAllWarnings(
  record: BuoyRecord,
  thresholds: WarningThresholds = DEFAULT_THRESHOLDS
): WaterQualityWarning[] {
  const warnings: WaterQualityWarning[] = [];

  warnings.push(calculatePlasticWarning(record, thresholds));
  warnings.push(calculateTurbidityWarning(record, thresholds));
  warnings.push(calculateSalinityWarning(record, thresholds));
  warnings.push(calculateTemperatureWarning(record, thresholds));
  warnings.push(calculateCompositeIndex(record, thresholds));

  return warnings;
}

function calculatePlasticWarning(
  record: BuoyRecord,
  thresholds: WarningThresholds
): WaterQualityWarning {
  const value = safeGet(record, "plasticConcentration");
  const isTriggered = value !== null && value > thresholds.plasticConcentration;
  const ratio = value !== null ? value / thresholds.plasticConcentration : 0;

  return {
    id: "plastic",
    indicatorName: "塑料浓度超标预警",
    indicatorCode: "PC-W01",
    currentValue: value ?? 0,
    unit: "个/m³",
    threshold: thresholds.plasticConcentration,
    formula: "C_plastic > T_plastic",
    formulaDescription:
      "当实际测量的塑料浓度 C_plastic 超过阈值 T_plastic 时触发预警。阈值根据近岸二类海域环保标准设定。",
    applicableScope:
      "适用于中国东部沿海近岸海域（水深 0-50m），适用于微塑料及以上颗粒检测。不适用于大洋开阔水域。",
    failureReason:
      "若浮标传感器被大型海藻遮挡、或采样滤网破损，可能导致浓度读数偏低（漏报）；若周边存在港口疏浚作业，悬浮物可能被误判为微塑料（误报）。",
    isTriggered,
    severity: ratio > 2 ? "high" : ratio > 1.5 ? "medium" : "low",
    variables: [
      {
        name: "C_plastic",
        label: "实测塑料浓度",
        value,
        unit: "个/m³",
      },
      {
        name: "T_plastic",
        label: "塑料浓度阈值",
        value: thresholds.plasticConcentration,
        unit: "个/m³",
      },
    ],
  };
}

function calculateTurbidityWarning(
  record: BuoyRecord,
  thresholds: WarningThresholds
): WaterQualityWarning {
  const value = safeGet(record, "turbidity");
  const isTriggered = value !== null && value > thresholds.turbidity;
  const ratio = value !== null ? value / thresholds.turbidity : 0;

  return {
    id: "turbidity",
    indicatorName: "浊度超标预警",
    indicatorCode: "TB-W02",
    currentValue: value ?? 0,
    unit: "NTU",
    threshold: thresholds.turbidity,
    formula: "Turbidity > T_turbidity",
    formulaDescription:
      "当水体浊度超过阈值时触发。浊度反映水中悬浮颗粒物对光的散射程度，与塑料垃圾浓度正相关。",
    applicableScope:
      "适用于河口、近岸等相对静止水域。暴雨期、潮汐期浊度自然升高需结合潮汐表综合判断。",
    failureReason:
      "暴雨径流带来的泥沙会显著提升浊度但不代表塑料污染；夜晚生物浮游生物垂直迁移可能干扰读数。",
    isTriggered,
    severity: ratio > 2 ? "high" : ratio > 1.5 ? "medium" : "low",
    variables: [
      { name: "Turbidity", label: "实测浊度", value, unit: "NTU" },
      {
        name: "T_turbidity",
        label: "浊度阈值",
        value: thresholds.turbidity,
        unit: "NTU",
      },
    ],
  };
}

function calculateSalinityWarning(
  record: BuoyRecord,
  thresholds: WarningThresholds
): WaterQualityWarning {
  const value = safeGet(record, "salinity");
  const isTriggered =
    value !== null &&
    (value < thresholds.salinityMin || value > thresholds.salinityMax);

  return {
    id: "salinity",
    indicatorName: "盐度异常预警",
    indicatorCode: "SA-W03",
    currentValue: value ?? 0,
    unit: "PSU",
    threshold: NaN,
    formula: "S < S_min OR S > S_max",
    formulaDescription:
      "盐度超出正常范围 [S_min, S_max] 时触发。异常盐度可能表明淡水入侵或蒸发异常，影响塑料沉降行为。",
    applicableScope: "适用于近海表层水（0-10m），正常海水盐度范围 28-38 PSU。",
    failureReason:
      "浮标传感器膜片污染可导致读数漂移；河口位置受径流量影响大，需结合当日潮汐表判定是否为异常。",
    isTriggered,
    severity:
      value !== null && Math.abs(value - 33) > 8 ? "high" : "medium",
    variables: [
      { name: "S", label: "实测盐度", value, unit: "PSU" },
      { name: "S_min", label: "盐度下限", value: thresholds.salinityMin, unit: "PSU" },
      { name: "S_max", label: "盐度上限", value: thresholds.salinityMax, unit: "PSU" },
    ],
  };
}

function calculateTemperatureWarning(
  record: BuoyRecord,
  thresholds: WarningThresholds
): WaterQualityWarning {
  const value = safeGet(record, "temperature");
  const isTriggered = value !== null && value > thresholds.temperatureMax;
  const ratio = value !== null ? value / thresholds.temperatureMax : 0;

  return {
    id: "temperature",
    indicatorName: "水温异常预警",
    indicatorCode: "TP-W04",
    currentValue: value ?? 0,
    unit: "°C",
    threshold: thresholds.temperatureMax,
    formula: "T_water > T_max",
    formulaDescription:
      "水温超过阈值时触发。异常高温会加速微塑料降解速率，改变其在水体中的分布特征。",
    applicableScope:
      "适用于温带海域春夏季（3月-9月）监测。冬季水温普遍低于阈值，本指标自动降权。",
    failureReason:
      "传感器长时间暴晒、浮标搁浅于浅滩可导致水温读数偏高；需结合水深数据排除假阳性。",
    isTriggered,
    severity: ratio > 1.1 ? "high" : ratio > 1.05 ? "medium" : "low",
    variables: [
      { name: "T_water", label: "实测水温", value, unit: "°C" },
      { name: "T_max", label: "水温阈值", value: thresholds.temperatureMax, unit: "°C" },
    ],
  };
}

function calculateCompositeIndex(
  record: BuoyRecord,
  thresholds: WarningThresholds
): WaterQualityWarning {
  const plastic = safeGet(record, "plasticConcentration");
  const turbidity = safeGet(record, "turbidity");

  const plasticRatio =
    plastic !== null ? plastic / thresholds.plasticConcentration : 0;
  const turbidityRatio =
    turbidity !== null ? turbidity / thresholds.turbidity : 0;

  const compositeValue =
    plastic !== null && turbidity !== null
      ? Number((0.6 * plasticRatio + 0.4 * turbidityRatio).toFixed(3))
      : 0;

  const isTriggered = compositeValue > 1.0;

  return {
    id: "composite",
    indicatorName: "海洋塑料综合污染指数",
    indicatorCode: "COMP-W05",
    currentValue: compositeValue,
    unit: "无量纲",
    threshold: 1.0,
    formula: "I = 0.6 × (C_p / T_p) + 0.4 × (Turb / T_turb)",
    formulaDescription:
      "综合污染指数 I 由塑料浓度比（权重 0.6）和浊度比（权重 0.4）加权求和。I > 1.0 时触发综合预警。",
    applicableScope:
      "适用于常规巡查日报告的综合评估，建议在平潮期采集数据以保证可比性。",
    failureReason:
      "任一子指标数据缺失时综合指数不具参考意义；暴雨后 48 小时内浊度权重建议临时下调至 0.2。",
    isTriggered,
    severity: compositeValue > 2 ? "high" : compositeValue > 1.5 ? "medium" : "low",
    variables: [
      { name: "C_p", label: "塑料浓度", value: plastic, unit: "个/m³" },
      { name: "T_p", label: "塑料阈值", value: thresholds.plasticConcentration, unit: "个/m³" },
      { name: "Turb", label: "浊度", value: turbidity, unit: "NTU" },
      { name: "T_turb", label: "浊度阈值", value: thresholds.turbidity, unit: "NTU" },
    ],
  };
}
