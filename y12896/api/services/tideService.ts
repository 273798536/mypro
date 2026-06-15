import { scenarios } from "../data/scenarios.js";

const TIMEZONE_OFFSETS: Record<string, number> = {
  "UTC": 0,
  "Asia/Shanghai": 8,
  "Asia/Tokyo": 9,
  "Asia/Singapore": 8,
  "Asia/Bangkok": 7,
  "Asia/Seoul": 9,
  "America/New_York": -5,
  "America/Los_Angeles": -8,
  "Europe/London": 0,
  "Europe/Paris": 1,
};

function shiftTime(isoTime: string, offsetHours: number): string {
  const d = new Date(isoTime);
  d.setUTCHours(d.getUTCHours() + offsetHours);
  return d.toISOString();
}

export function getScenario(id: string) {
  return scenarios[id] || null;
}

export function listScenarios() {
  return Object.values(scenarios).map((s) => ({
    id: s.id,
    name: s.name,
    tideType: s.tideType,
    description: s.description,
  }));
}

export function getTideData(scenarioId: string, requestedTimezone?: string) {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;

  const tz = requestedTimezone || scenario.defaultTimezone;
  const defaultOffset = TIMEZONE_OFFSETS[scenario.defaultTimezone] ?? 0;
  const requestedOffset = TIMEZONE_OFFSETS[tz] ?? 0;
  const shiftHours = requestedOffset - defaultOffset;

  let timezoneWarning: string | undefined;
  if (shiftHours !== 0) {
    timezoneWarning = `⚠️ 时区提示：当前潮汐数据基于 ${scenario.defaultTimezone}（UTC${defaultOffset >= 0 ? "+" : ""}${defaultOffset}），但您请求的是 ${tz}（UTC${requestedOffset >= 0 ? "+" : ""}${requestedOffset}）。潮位时间已偏移 ${shiftHours > 0 ? "+" : ""}${shiftHours} 小时。请确认潮汐表标注的时区是否正确——如果使用了错误的时区，高潮时间可能完全错位，导致闸门策略全部错误！`;
  }

  const shiftedTides = scenario.tides.map((t) => {
    const shiftedTime = shiftTime(t.time, shiftHours);
    return { ...t, time: shiftedTime };
  });

  return {
    scenarioId,
    timezone: tz,
    timezoneOffset: requestedOffset,
    timezoneWarning,
    data: shiftedTides,
  };
}

export function getProtectionRecords(scenarioId: string) {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;
  return { records: scenario.protectionRecords };
}
