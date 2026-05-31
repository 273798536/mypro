import type {
  SimParams,
  SimResult,
  HourlyResult,
  AnomalyEvent,
  SimSummary,
} from "../types";
import { ELECTRICITY_SCHEDULE, DEFAULT_PARAMS } from "../data/constants";
import type { ElectricityPeriod, AnomalyType } from "../types";

function buildParams(overrides: Partial<SimParams>): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

function computeChlorine(
  currentChlorine: number,
  decayRate: number,
  visitors: number,
  visitorImpact: number,
  isPumpRunning: boolean,
  poolVolume: number,
  pumpFlow: number
): { afterDecay: number; afterPump: number } {
  let chlorine = currentChlorine * (1 - decayRate) - visitorImpact * visitors;
  chlorine = Math.max(0, chlorine);
  const afterDecay = chlorine;
  if (isPumpRunning) {
    const turnoverRatio = pumpFlow / poolVolume;
    chlorine = chlorine * (1 - turnoverRatio) + 1.5 * turnoverRatio;
  }
  return { afterDecay, afterPump: chlorine };
}

function detectAnomalies(
  hour: number,
  chlorineBeforeDose: number,
  chlorineAfter: number,
  pumpScheduled: boolean,
  pumpRunning: boolean,
  visitors: number,
  visitorBaseline: number,
  params: SimParams
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];

  if (chlorineBeforeDose < params.chlorineThreshold) {
    anomalies.push({
      type: "low_chlorine",
      hour,
      description: `${hour}:00 余氯降至 ${chlorineBeforeDose.toFixed(2)} mg/L，低于安全阈值 ${params.chlorineThreshold} mg/L`,
      traceRef: {
        calculation: `循环周期 = ${params.poolVolume}m³ ÷ ${params.pumpFlow}m³/h = ${(params.poolVolume / params.pumpFlow).toFixed(2)}h`,
        chlorinePrediction: `衰减模型: C(t+1) = C(t)×(1-${params.chlorineDecayRate}) - ${params.visitorImpact}×访客数(${visitors}) = ${chlorineBeforeDose.toFixed(3)} mg/L`,
        scheduleAdvice: chlorineBeforeDose < params.chlorineThreshold
          ? "已触发自动投加：补充余氯至安全水平"
          : "当前余氯安全，无需额外投加",
      },
    });
  }

  if (pumpScheduled && !pumpRunning) {
    anomalies.push({
      type: "pump_shutdown",
      hour,
      description: `${hour}:00 泵计划运行但实际停机，循环中断，余氯衰减加速`,
      traceRef: {
        calculation: `计划循环水量 = ${params.pumpFlow}m³/h，实际 = 0m³/h，损失 ${(params.pumpFlow).toFixed(0)}m³ 循环量`,
        chlorinePrediction: `无循环补给，余氯仅靠自然衰减，该时段衰减率 ${params.chlorineDecayRate}，访客消耗 ${params.visitorImpact}×${visitors}`,
        scheduleAdvice: "检查泵设备状态，修复后优先在谷时电价时段补开循环",
      },
    });
  }

  if (visitors > visitorBaseline * 2 && visitorBaseline > 0) {
    anomalies.push({
      type: "visitor_surge",
      hour,
      description: `${hour}:00 客流 ${visitors} 人，达基线 ${visitorBaseline} 人的 ${(visitors / visitorBaseline).toFixed(1)} 倍，余氯消耗骤增`,
      traceRef: {
        calculation: `访客消耗余氯 = ${params.visitorImpact}×${visitors} = ${(params.visitorImpact * visitors).toFixed(3)} mg/L`,
        chlorinePrediction: `高客流导致余氯额外消耗 ${(params.visitorImpact * visitors).toFixed(3)} mg/L，叠加自然衰减 ${params.chlorineDecayRate}`,
        scheduleAdvice: "客流高峰期建议加大泵流量或提前投加余氯，避免跌破阈值",
      },
    });
  }

  return anomalies;
}

export function runSimulation(overrides: Partial<SimParams> = {}): SimResult {
  const params = buildParams(overrides);
  const schedule = ELECTRICITY_SCHEDULE;
  const hourlyResults: HourlyResult[] = [];

  let currentChlorine = params.initialChlorine;

  for (let hour = 0; hour < 24; hour++) {
    const elecPeriod: ElectricityPeriod = schedule[hour];
    const visitors = params.visitorCurve[hour] || 0;
    const visitorBaseline = DEFAULT_PARAMS.visitorCurve[hour] || 0;

    const isPumpScheduled =
      elecPeriod.type === "valley" ||
      (elecPeriod.type === "flat" && visitors > 20) ||
      currentChlorine < params.chlorineThreshold;
    const isPumpShutdown = params.pumpShutdownHours.includes(hour);
    const isPumpRunning = isPumpScheduled && !isPumpShutdown;

    const { afterDecay, afterPump } = computeChlorine(
      currentChlorine,
      params.chlorineDecayRate,
      visitors,
      params.visitorImpact,
      isPumpRunning,
      params.poolVolume,
      params.pumpFlow
    );

    const chlorineBeforeDose = afterPump;
    let finalChlorine = afterPump;
    let chlorinDosed = false;

    if (finalChlorine < params.chlorineThreshold) {
      finalChlorine += params.chlorineDoseAmount;
      chlorinDosed = true;
    }

    const circulationVolume = isPumpRunning ? params.pumpFlow : 0;
    const pumpPowerKW = params.pumpFlow * 0.15;
    const electricityCost = isPumpRunning
      ? pumpPowerKW * elecPeriod.price
      : 0;

    const anomalyList = detectAnomalies(
      hour,
      chlorineBeforeDose,
      finalChlorine,
      isPumpScheduled,
      isPumpRunning,
      visitors,
      visitorBaseline,
      params
    );

    hourlyResults.push({
      hour,
      chlorineLevel: Math.round(finalChlorine * 1000) / 1000,
      chlorineBeforeDose: Math.round(chlorineBeforeDose * 1000) / 1000,
      pumpRunning: isPumpRunning,
      pumpScheduled: isPumpScheduled,
      electricityType: elecPeriod.type,
      electricityPrice: elecPeriod.price,
      electricityCost: Math.round(electricityCost * 100) / 100,
      circulationVolume,
      visitorCount: visitors,
      visitorBaseline,
      anomaly: anomalyList.length > 0 ? anomalyList[0] : null,
      chlorineDosed: chlorinDosed,
    });

    currentChlorine = finalChlorine;
  }

  const summary = buildSummary(params, hourlyResults);

  return {
    params,
    electricitySchedule: schedule,
    hourlyResults,
    summary,
  };
}

function buildSummary(
  params: SimParams,
  results: HourlyResult[]
): SimSummary {
  const totalCost = results.reduce((s, r) => s + r.electricityCost, 0);
  const chlorineLevels = results.map((r) => r.chlorineLevel);
  const avgChlorine =
    chlorineLevels.reduce((s, c) => s + c, 0) / chlorineLevels.length;
  const minChlorine = Math.min(...chlorineLevels);
  const minChlorineHour = chlorineLevels.indexOf(minChlorine);
  const cyclePeriod = params.poolVolume / params.pumpFlow;
  const dailyCycles = 24 / cyclePeriod;

  const anomalyCount = results.filter((r) => r.anomaly !== null).length;
  const anomalyTypes: Record<AnomalyType, number> = {
    low_chlorine: 0,
    pump_shutdown: 0,
    visitor_surge: 0,
  };
  results.forEach((r) => {
    if (r.anomaly) {
      anomalyTypes[r.anomaly.type]++;
    }
  });

  const runningHours = results.filter((r) => r.pumpRunning).length;
  const pumpFlowConclusion = `泵流量 ${params.pumpFlow} m³/h，日运行 ${runningHours}h，日循环量 ${params.pumpFlow * runningHours} m³，循环周期 ${cyclePeriod.toFixed(2)}h，日循环 ${dailyCycles.toFixed(2)} 次`;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    avgChlorine: Math.round(avgChlorine * 1000) / 1000,
    minChlorine: Math.round(minChlorine * 1000) / 1000,
    minChlorineHour,
    cyclePeriod: Math.round(cyclePeriod * 100) / 100,
    dailyCycles: Math.round(dailyCycles * 100) / 100,
    anomalyCount,
    anomalyTypes,
    pumpFlowConclusion,
  };
}
