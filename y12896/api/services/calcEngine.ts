import { scenarios, type TidePoint, type GateStrategyPoint } from "../data/scenarios.js";
import * as tideService from "./tideService.js";
import * as gateService from "./gateService.js";

export type Phase = "generating" | "storing" | "idle" | "discarding";
export type AlertLevel = "info" | "warning" | "danger" | "shutdown";

export interface TimelineAlert {
  level: AlertLevel;
  message: string;
  code: string;
}

export interface TimelinePoint {
  time: string;
  tideLevel: number;
  reservoirLevel: number;
  gateOpening: number;
  flowRate: number;
  head: number;
  power: number;
  energy: number;
  phase: Phase;
  efficiency: number;
  unitTemp: number;
  alerts: TimelineAlert[];
  isHighTide?: boolean;
  isLowTide?: boolean;
}

export interface CalcResult {
  totalEnergy: number;
  peakPower: number;
  averageEfficiency: number;
  waterDiscarded: Array<{
    startTime: string;
    endTime: string;
    volume: number;
    reason: string;
  }>;
  timeline: TimelinePoint[];
  alerts: Array<{
    level: AlertLevel;
    message: string;
    code: string;
    timestamp: string;
    detail: string;
  }>;
}

const MAX_HEAD = 4.0;
const HOURS_PER_STEP = 0.5;
const RESERVOIR_AREA = 1_000_000;
const SECONDS_PER_STEP = HOURS_PER_STEP * 3600;

function interpolateEfficiency(head: number, curve: Array<{ head: number; efficiency: number }>) {
  if (head <= curve[0].head) return curve[0].efficiency;
  if (head >= curve[curve.length - 1].head) return curve[curve.length - 1].efficiency;
  for (let i = 1; i < curve.length; i++) {
    if (head <= curve[i].head) {
      const ratio = (head - curve[i - 1].head) / (curve[i].head - curve[i - 1].head);
      return curve[i - 1].efficiency + ratio * (curve[i].efficiency - curve[i - 1].efficiency);
    }
  }
  return 0;
}

export function calculate(
  scenarioId: string,
  strategy: "correct" | "wrong" | "custom",
  customGates?: GateStrategyPoint[],
  timezone?: string
): CalcResult | null {
  const scenario = scenarios[scenarioId];
  if (!scenario) return null;

  const tideResult = tideService.getTideData(scenarioId, timezone);
  if (!tideResult) return null;
  const tides: TidePoint[] = tideResult.data;

  let gates: GateStrategyPoint[];
  if (strategy === "custom" && customGates) {
    gates = customGates;
  } else {
    gates = gateService.getGateStrategy(scenarioId, strategy === "wrong" ? "wrong" : "correct")!;
  }

  const gateMap = new Map(gates.map((g) => [g.time, g.openingPercent]));

  const timeline: TimelinePoint[] = [];
  const globalAlerts: CalcResult["alerts"] = [];
  const waterDiscarded: CalcResult["waterDiscarded"] = [];
  let currentDiscard: { startTime: string; volume: number; reason: string } | null = null;

  let reservoirLevel = scenario.tides[0]?.tideLevel ?? 2.0;
  let cumulativeEnergy = 0;
  let peakPower = 0;
  let unitTemp = 45;
  let highPowerCycles = 0;
  let isShutdown = false;
  let shutdownCyclesRemaining = 0;
  const effSum = { total: 0, count: 0 };

  if (tideResult.timezoneWarning) {
    globalAlerts.push({
      level: "info",
      message: "时区偏移警告",
      code: "TZ001",
      timestamp: tides[0].time,
      detail: tideResult.timezoneWarning,
    });
  }

  for (let i = 0; i < tides.length; i++) {
    const tide = tides[i];
    const gateOpening = Math.max(0, Math.min(100, gateMap.get(tide.time) ?? 0));
    const head = Math.abs(tide.tideLevel - reservoirLevel);
    const flowDirection = tide.tideLevel > reservoirLevel ? 1 : -1;
    const headFactor = Math.min(1, head / MAX_HEAD);
    const openingFactor = gateOpening / 100;
    const rawFlow = scenario.unitConfig.ratedFlow * openingFactor * headFactor;
    let flowRate = rawFlow * flowDirection;

    if (isShutdown) {
      flowRate = 0;
      shutdownCyclesRemaining--;
      if (shutdownCyclesRemaining <= 0) {
        isShutdown = false;
        globalAlerts.push({
          level: "info",
          message: "机组冷却完成，恢复运行",
          code: "OT003",
          timestamp: tide.time,
          detail: "温度已降至安全范围，机组重新并网。教学提示：大型水轮机组停机冷却通常需要30-60分钟。",
        });
      }
    }

    const efficiency = interpolateEfficiency(head, scenario.unitConfig.efficiencyCurve);
    const waterPower = Math.abs(flowRate) * 9.81 * head;
    let power = (waterPower * efficiency) / 1000;

    if (power > scenario.unitConfig.maxPower) {
      power = scenario.unitConfig.maxPower;
    }
    if (Math.abs(flowRate) < 1 || head < 0.3) {
      power = 0;
    }

    const stepEnergy = power * HOURS_PER_STEP;
    cumulativeEnergy += stepEnergy;
    if (power > peakPower) peakPower = power;
    if (efficiency > 0 && power > 0) {
      effSum.total += efficiency;
      effSum.count++;
    }

    const pointAlerts: TimelineAlert[] = [];
    let phase: Phase = "idle";

    if (!isShutdown) {
      if (tide.phase === "falling" && gateOpening > 10 && reservoirLevel > tide.tideLevel + 0.1) {
        phase = "generating";
      } else if (tide.phase === "rising" && gateOpening < 10) {
        phase = "storing";
      } else if (tide.phase === "rising" && gateOpening > 10) {
        phase = "discarding";
        const volume = Math.abs(flowRate) * SECONDS_PER_STEP;
        if (!currentDiscard) {
          currentDiscard = { startTime: tide.time, volume: 0, reason: "涨潮期开闸泄水" };
        }
        currentDiscard.volume += volume;
        pointAlerts.push({
          level: "danger",
          message: "涨潮开闸，势能流失",
          code: "D001",
        });
      } else if (tide.phase === "falling" && gateOpening < 10) {
        pointAlerts.push({
          level: "warning",
          message: "落潮关闸，错失发电",
          code: "G002",
        });
      }
    }

    if (phase !== "discarding" && currentDiscard) {
      waterDiscarded.push({ ...currentDiscard, endTime: tide.time });
      currentDiscard = null;
    }

    if (power > scenario.unitConfig.maxPower * 0.9) {
      highPowerCycles++;
      unitTemp += 2.5;
    } else if (power > scenario.unitConfig.maxPower * 0.5) {
      unitTemp += 0.5;
    } else {
      unitTemp = Math.max(40, unitTemp - 1.5);
    }

    if (highPowerCycles > 5 && !isShutdown) {
      pointAlerts.push({
        level: "warning",
        message: "机组温度偏高",
        code: "OT001",
      });
    }

    if (unitTemp > scenario.unitConfig.overheatThreshold && !isShutdown) {
      isShutdown = true;
      shutdownCyclesRemaining = 6;
      highPowerCycles = 0;
      power = 0;
      flowRate = 0;
      pointAlerts.push({
        level: "shutdown",
        message: "过温保护：机组自动停机",
        code: "OT002",
      });
      globalAlerts.push({
        level: "shutdown",
        message: "过温保护触发，机组停机冷却",
        code: "OT002",
        timestamp: tide.time,
        detail: `机组温度达到 ${unitTemp.toFixed(1)}°C，超过阈值 ${scenario.unitConfig.overheatThreshold}°C。教学提示：长时间满负荷运行会导致定子绕组过热，此时发电效率反而下降，保护装置会强制停机。正确的调度策略应避免长时间持续满负荷。`,
      });
    }

    if (head < 0.5 && gateOpening > 50 && !isShutdown) {
      pointAlerts.push({
        level: "warning",
        message: "水头不足，效率低下",
        code: "HD001",
      });
    }

    if (tide.isHighTide) {
      pointAlerts.push({
        level: "info",
        message: "高潮位：关闸蓄水完成",
        code: "TI001",
      });
    }
    if (tide.isLowTide) {
      pointAlerts.push({
        level: "info",
        message: "低潮位：放水结束",
        code: "TI002",
      });
    }

    const flowVolumeCubicMeters = flowRate * SECONDS_PER_STEP;
    const levelChange = flowVolumeCubicMeters / RESERVOIR_AREA;
    reservoirLevel = Math.max(
      0,
      Math.min(5.5, reservoirLevel - levelChange)
    );

    const override = scenario.protectionRecords.find((r) => {
      const rt = new Date(r.timestamp).getTime();
      const tt = new Date(tide.time).getTime();
      return Math.abs(rt - tt) < 30 * 60 * 1000;
    });
    if (override) {
      let level: AlertLevel = "info";
      let code = "";
      if (override.type === "overheat") { level = "shutdown"; code = "PR-OT"; }
      else if (override.type === "overspeed") { level = "danger"; code = "PR-OS"; }
      else if (override.type === "vibration") { level = "warning"; code = "PR-VB"; }
      else if (override.type === "manual_override") { level = "info"; code = "PR-MO"; }

      pointAlerts.push({ level, message: override.description, code });
      globalAlerts.push({
        level,
        message: override.description,
        code,
        timestamp: tide.time,
        detail: `${override.description}。触发值 ${override.triggerValue}${override.unit}，阈值 ${override.threshold}${override.unit}。处置措施：${override.action}。${override.teachingNote}`,
      });
    }

    timeline.push({
      time: tide.time,
      tideLevel: tide.tideLevel,
      reservoirLevel: Math.round(reservoirLevel * 100) / 100,
      gateOpening,
      flowRate: Math.round(flowRate * 100) / 100,
      head: Math.round(head * 100) / 100,
      power: Math.round(power * 100) / 100,
      energy: Math.round(cumulativeEnergy * 100) / 100,
      phase,
      efficiency: Math.round(efficiency * 10000) / 100,
      unitTemp: Math.round(unitTemp * 10) / 10,
      alerts: pointAlerts,
      isHighTide: tide.isHighTide,
      isLowTide: tide.isLowTide,
    });
  }

  if (currentDiscard) {
    waterDiscarded.push({
      ...currentDiscard,
      endTime: tides[tides.length - 1].time,
    });
  }

  if (strategy === "wrong") {
    globalAlerts.push({
      level: "info",
      message: "采用错误策略：涨潮开闸",
      code: "S001",
      timestamp: tides[0].time,
      detail: "本演示使用了学生常见的错误理解——'涨潮开闸、落潮关闸'。对比正确策略（涨潮蓄水关闸、落潮开闸发电），可以直观看到发电量差距和大量弃水问题。",
    });
  }

  return {
    totalEnergy: Math.round(cumulativeEnergy * 100) / 100,
    peakPower: Math.round(peakPower * 100) / 100,
    averageEfficiency: effSum.count > 0 ? Math.round((effSum.total / effSum.count) * 10000) / 100 : 0,
    waterDiscarded: waterDiscarded.map((w) => ({
      ...w,
      volume: Math.round(w.volume),
    })),
    timeline,
    alerts: globalAlerts,
  };
}
