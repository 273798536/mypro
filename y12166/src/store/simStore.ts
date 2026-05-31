import { create } from "zustand";
import type { SimResult, SimParams, AnomalyEvent } from "../types";
import { runSimulation } from "../engine/simulation";
import { SCENARIO_PRESETS, DEFAULT_PARAMS } from "../data/constants";

interface SimStore {
  scenarioName: string;
  params: SimParams;
  result: SimResult | null;
  isRunning: boolean;

  selectScenario: (name: string) => void;
  updateParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  run: () => void;
}

export const useSimStore = create<SimStore>((set, get) => ({
  scenarioName: "normal",
  params: { ...DEFAULT_PARAMS },
  result: null,
  isRunning: false,

  selectScenario: (name: string) => {
    const preset = SCENARIO_PRESETS.find((s) => s.name === name);
    if (!preset) return;
    const baseParams = { ...DEFAULT_PARAMS };
    const merged = { ...baseParams, ...preset.params };
    set({ scenarioName: name, params: merged });
  },

  updateParam: (key, value) => {
    set((state) => ({
      params: { ...state.params, [key]: value },
    }));
  },

  run: () => {
    set({ isRunning: true });
    const { params } = get();
    const result = runSimulation(params);
    set({ result, isRunning: false });
  },
}));

export function exportCSV(result: SimResult): string {
  const headers = [
    "时段",
    "余氯(mg/L)",
    "投加前余氯(mg/L)",
    "泵运行",
    "计划运行",
    "电价类型",
    "电价(元/kWh)",
    "电费(元)",
    "循环水量(m³)",
    "客流量",
    "客流基线",
    "余氯投加",
    "异常类型",
    "异常说明",
  ];

  const rows = result.hourlyResults.map((r) => [
    `${String(r.hour).padStart(2, "0")}:00`,
    r.chlorineLevel,
    r.chlorineBeforeDose,
    r.pumpRunning ? "是" : "否",
    r.pumpScheduled ? "是" : "否",
    r.electricityType === "peak" ? "峰" : r.electricityType === "valley" ? "谷" : "平",
    r.electricityPrice,
    r.electricityCost,
    r.circulationVolume,
    r.visitorCount,
    r.visitorBaseline,
    r.chlorineDosed ? "是" : "否",
    r.anomaly ? r.anomaly.type : "",
    r.anomaly ? `"${r.anomaly.description}"` : "",
  ]);

  const summaryRows = [
    [],
    ["--- 仿真摘要 ---"],
    ["泵流量结论", `"${result.summary.pumpFlowConclusion}"`],
    ["总电费(元)", result.summary.totalCost],
    ["平均余氯(mg/L)", result.summary.avgChlorine],
    ["最低余氯(mg/L)", result.summary.minChlorine],
    ["最低余氯时段", `${String(result.summary.minChlorineHour).padStart(2, "0")}:00`],
    ["循环周期(h)", result.summary.cyclePeriod],
    ["日循环次数", result.summary.dailyCycles],
    ["异常总数", result.summary.anomalyCount],
    ["余氯偏低次数", result.summary.anomalyTypes.low_chlorine],
    ["泵停机次数", result.summary.anomalyTypes.pump_shutdown],
    ["客流突增次数", result.summary.anomalyTypes.visitor_surge],
  ];

  const allRows = [headers, ...rows, ...summaryRows];
  return allRows.map((row) => row.join(",")).join("\n");
}

export function generateTerminalSummary(result: SimResult): string {
  const s = result.summary;
  const lines = [
    "╔══════════════════════════════════════════════╗",
    "║        游泳池水循环仿真 — 运行摘要           ║",
    "╚══════════════════════════════════════════════╝",
    "",
    `泵流量结论: ${s.pumpFlowConclusion}`,
    "",
    `总电费: ${s.totalCost} 元`,
    `平均余氯: ${s.avgChlorine} mg/L`,
    `最低余氯: ${s.minChlorine} mg/L (${String(s.minChlorineHour).padStart(2, "0")}:00)`,
    `循环周期: ${s.cyclePeriod} h`,
    `日循环次数: ${s.dailyCycles}`,
    "",
    `异常总数: ${s.anomalyCount}`,
    `  余氯偏低: ${s.anomalyTypes.low_chlorine} 次`,
    `  泵停机:   ${s.anomalyTypes.pump_shutdown} 次`,
    `  客流突增: ${s.anomalyTypes.visitor_surge} 次`,
    "",
  ];

  const anomalies = result.hourlyResults.filter((r) => r.anomaly !== null);
  if (anomalies.length > 0) {
    lines.push("异常事件明细:");
    anomalies.forEach((r) => {
      const a = r.anomaly as AnomalyEvent;
      lines.push(`  [${String(r.hour).padStart(2, "0")}:00] ${a.description}`);
    });
  } else {
    lines.push("无异常事件，仿真运行正常。");
  }

  return lines.join("\n");
}
