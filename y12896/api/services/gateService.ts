import { scenarios, type GateStrategyPoint } from "../data/scenarios.js";
import * as tideService from "./tideService.js";

const OVERRIDES: Record<string, GateStrategyPoint[]> = {};

export function getGateStrategy(
  scenarioId: string,
  type: "correct" | "wrong",
  requestedTimezone?: string
): GateStrategyPoint[] | null {
  const scenario = scenarios[scenarioId];
  if (!scenario) return null;

  const base = type === "correct" ? scenario.correctStrategy : scenario.wrongStrategy;
  const overrides = OVERRIDES[scenarioId] || [];

  const withOverrides: GateStrategyPoint[] =
    overrides.length === 0
      ? base
      : (() => {
          const overrideMap = new Map(overrides.map((o) => [o.time, o.openingPercent]));
          return base.map((p) =>
            overrideMap.has(p.time) ? { ...p, openingPercent: overrideMap.get(p.time)! } : p
          );
        })();

  const shiftHours = tideService.getShiftHours(scenarioId, requestedTimezone);
  return tideService.shiftTimes(withOverrides, shiftHours);
}

export function applyOverride(
  scenarioId: string,
  time: string,
  openingPercent: number,
  reason?: string,
  requestedTimezone?: string
) {
  if (!scenarios[scenarioId]) return null;
  const scenario = scenarios[scenarioId];

  const shiftHours = tideService.getShiftHours(scenarioId, requestedTimezone);
  const canonicalTime = tideService.shiftTime(time, -shiftHours);

  const tides = scenario.tides;
  let tidePoint = tides.find((t) => t.time === canonicalTime);
  if (!tidePoint) {
    let minDiff = Infinity;
    let closest: (typeof tides)[number] | null = null;
    const target = new Date(canonicalTime).getTime();
    for (const t of tides) {
      const diff = Math.abs(new Date(t.time).getTime() - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }
    if (closest && minDiff < 30 * 60 * 1000) {
      tidePoint = closest;
    }
  }

  let warning: string | undefined;
  let alert:
    | {
        level: "info" | "warning" | "danger";
        message: string;
        teachingNote: string;
      }
    | undefined;
  let riskLevel: "none" | "low" | "medium" | "high" = "none";
  let energyDelta = 0;

  if (tidePoint) {
    if (tidePoint.phase === "rising" && openingPercent === 0) {
      warning = "涨潮期关闭闸门是正确的蓄水策略，本次修改将增强蓄水能力。";
      riskLevel = "none";
      energyDelta = 30;
    } else if (tidePoint.phase === "rising" && openingPercent > 0) {
      warning = "涨潮期打开闸门会让海水白白流走，无法积蓄高水位的势能，这是典型的错误操作！";
      alert = {
        level: "danger",
        message: "涨潮开闸：弃水预警",
        teachingNote:
          "潮汐发电的核心是利用高水位与低水位之间的水头差。涨潮期应该关闸蓄水，让水库水位随大海升高；落潮期再开闸放水，利用海水从水库流向大海的动力推动水轮机。涨潮开闸就等于把'水库的高水位'直接放回大海，毫无发电价值——这就是'涨潮开闸'的常见误解！",
      };
      riskLevel = "high";
      energyDelta = -120;
    } else if (tidePoint.phase === "falling" && openingPercent === 0) {
      warning = "落潮期关闭闸门会丧失宝贵的发电时机，水库水位无法下降，水头差无法转化为电能。";
      alert = {
        level: "warning",
        message: "落潮关闸：损失发电窗口",
        teachingNote:
          "落潮时大海水位不断下降，此时水库中的高水位与大海之间形成了水头差。关闭闸门虽然保持了水位，但水头差无法利用。等到下次涨潮，两边水位又会齐平——等于白白浪费了一次落潮过程。",
      };
      riskLevel = "medium";
      energyDelta = -90;
    } else if (tidePoint.phase === "falling" && openingPercent > 80) {
      warning = "落潮期大开度开闸是正确的发电策略，但开度超过90%时要注意机组是否过热。";
      riskLevel = "low";
      energyDelta = 50;
    } else if (tidePoint.phase === "slack") {
      warning = "平潮期（潮汐转向时）水头差极小，无论开关闸门都意义不大，建议待机。";
      riskLevel = "low";
      energyDelta = -5;
    }
  } else {
    warning = "未找到对应时间的潮位数据，本次修改作为自由覆盖项存储。";
    riskLevel = "low";
    energyDelta = 0;
  }

  if (!OVERRIDES[scenarioId]) OVERRIDES[scenarioId] = [];
  const existing = OVERRIDES[scenarioId].findIndex((o) => o.time === canonicalTime);
  const record = { time: canonicalTime, openingPercent };
  if (existing >= 0) OVERRIDES[scenarioId][existing] = record;
  else OVERRIDES[scenarioId].push(record);

  return {
    success: true,
    canonicalTime,
    shiftedTime: tideService.shiftTime(canonicalTime, shiftHours),
    warning,
    impact: {
      energyDelta: Math.round(energyDelta),
      riskLevel,
    },
    alert,
    matchedTide: tidePoint
      ? {
          time: tidePoint.time,
          phase: tidePoint.phase,
          tideLevel: tidePoint.tideLevel,
          shiftedTime: tideService.shiftTime(tidePoint.time, shiftHours),
        }
      : null,
  };
}

export function clearOverrides(scenarioId: string) {
  if (OVERRIDES[scenarioId]) OVERRIDES[scenarioId] = [];
  return { success: true };
}

export function listOverrides(
  scenarioId: string,
  requestedTimezone?: string
): GateStrategyPoint[] {
  const items = OVERRIDES[scenarioId] || [];
  const shiftHours = tideService.getShiftHours(scenarioId, requestedTimezone);
  return tideService.shiftTimes(items, shiftHours);
}
