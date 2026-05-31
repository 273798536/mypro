import type { ElectricityPeriod, ScenarioPreset } from "../types";

export const ELECTRICITY_SCHEDULE: ElectricityPeriod[] = Array.from(
  { length: 24 },
  (_, hour) => {
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) {
      return { hour, type: "peak" as const, price: 1.2 };
    }
    if (hour >= 23 || hour < 7) {
      return { hour, type: "valley" as const, price: 0.4 };
    }
    return { hour, type: "flat" as const, price: 0.8 };
  }
);

export const STANDARD_VISITOR_CURVE = [
  0, 0, 0, 0, 0, 0, 2, 5, 15, 30, 40, 50, 45, 35, 25, 30, 45, 55, 40, 20,
  10, 5, 2, 0,
];

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    name: "normal",
    label: "正常运行",
    description: "标准参数，泵全日运行，余氯稳定在安全范围",
    params: {},
  },
  {
    name: "low_chlorine",
    label: "余氯偏低",
    description: "初始余氯仅0.8mg/L，衰减率加倍，容易跌破阈值",
    params: {
      initialChlorine: 0.8,
      chlorineDecayRate: 0.12,
    },
  },
  {
    name: "pump_shutdown",
    label: "泵停机",
    description: "10-14时泵意外停机，循环中断，余氯加速衰减",
    params: {
      pumpShutdownHours: [10, 11, 12, 13],
    },
  },
  {
    name: "visitor_surge",
    label: "客流突增",
    description: "14-18时客流激增至3倍，余氯消耗骤增",
    params: {
      visitorCurve: STANDARD_VISITOR_CURVE.map((v, i) =>
        i >= 14 && i <= 17 ? v * 3 : v
      ),
    },
  },
];

export const DEFAULT_PARAMS = {
  poolVolume: 500,
  pumpFlow: 60,
  initialChlorine: 1.5,
  chlorineDecayRate: 0.06,
  chlorineDoseAmount: 0.8,
  visitorImpact: 0.004,
  chlorineThreshold: 0.5,
  visitorCurve: STANDARD_VISITOR_CURVE,
  pumpShutdownHours: [] as number[],
};

export const ANOMALY_LABELS: Record<string, string> = {
  low_chlorine: "余氯偏低",
  pump_shutdown: "泵停机",
  visitor_surge: "客流突增",
};

export const ELECTRICITY_LABELS: Record<string, string> = {
  peak: "峰时",
  valley: "谷时",
  flat: "平时",
};

export const ELECTRICITY_COLORS: Record<string, string> = {
  peak: "#FF6B6B",
  valley: "#51CF66",
  flat: "#868E96",
};
