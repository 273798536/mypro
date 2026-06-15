export interface TidePoint {
  time: string;
  tideLevel: number;
  phase: "rising" | "falling" | "slack";
  isHighTide: boolean;
  isLowTide: boolean;
}

export interface GateStrategyPoint {
  time: string;
  openingPercent: number;
}

export interface ProtectionRecord {
  id: string;
  timestamp: string;
  type: "overheat" | "overspeed" | "vibration" | "manual_override";
  description: string;
  triggerValue: number;
  threshold: number;
  unit: string;
  action: string;
  teachingNote: string;
}

export interface EfficiencyPoint {
  head: number;
  efficiency: number;
}

export interface UnitConfig {
  maxPower: number;
  ratedFlow: number;
  overheatThreshold: number;
  vibrationThreshold: number;
  overspeedThreshold: number;
  efficiencyCurve: EfficiencyPoint[];
}

export interface ScenarioData {
  id: string;
  name: string;
  tideType: "semidiurnal" | "diurnal" | "mixed";
  description: string;
  defaultTimezone: string;
  tides: TidePoint[];
  correctStrategy: GateStrategyPoint[];
  wrongStrategy: GateStrategyPoint[];
  protectionRecords: ProtectionRecord[];
  unitConfig: UnitConfig;
}

const BASE_DATE = "2025-01-15";
const INTERVAL_MIN = 30;
const TOTAL_POINTS = 48;

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${BASE_DATE}T${hh}:${mm}:00.000Z`;
}

function generateSemidiurnalTides(): TidePoint[] {
  const tides: TidePoint[] = [];
  const meanLevel = 2.5;
  const amplitude = 1.8;
  const period = 12.42;

  let prevLevel = meanLevel;
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const hours = (i * INTERVAL_MIN) / 60;
    const tideLevel = meanLevel + amplitude * Math.sin((2 * Math.PI * hours) / period - Math.PI / 2);
    const nextHours = ((i + 1) * INTERVAL_MIN) / 60;
    const nextLevel = meanLevel + amplitude * Math.sin((2 * Math.PI * nextHours) / period - Math.PI / 2);

    let phase: "rising" | "falling" | "slack" = "slack";
    if (Math.abs(tideLevel - prevLevel) > 0.005) {
      phase = tideLevel > prevLevel ? "rising" : "falling";
    }

    const isPeak = tideLevel > prevLevel && tideLevel > nextLevel + 0.005;
    const isValley = tideLevel < prevLevel && tideLevel < nextLevel - 0.005;

    tides.push({
      time: formatTime(hours),
      tideLevel: Math.round(tideLevel * 100) / 100,
      phase,
      isHighTide: isPeak,
      isLowTide: isValley,
    });

    prevLevel = tideLevel;
  }
  return tides;
}

function generateDiurnalTides(): TidePoint[] {
  const tides: TidePoint[] = [];
  const meanLevel = 2.0;
  const amplitude = 0.9;
  const period = 24.0;

  let prevLevel = meanLevel;
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const hours = (i * INTERVAL_MIN) / 60;
    const tideLevel = meanLevel + amplitude * Math.sin((2 * Math.PI * hours) / period - Math.PI / 2);
    const nextHours = ((i + 1) * INTERVAL_MIN) / 60;
    const nextLevel = meanLevel + amplitude * Math.sin((2 * Math.PI * nextHours) / period - Math.PI / 2);

    let phase: "rising" | "falling" | "slack" = "slack";
    if (Math.abs(tideLevel - prevLevel) > 0.005) {
      phase = tideLevel > prevLevel ? "rising" : "falling";
    }

    const isPeak = tideLevel > prevLevel && tideLevel > nextLevel + 0.005;
    const isValley = tideLevel < prevLevel && tideLevel < nextLevel - 0.005;

    tides.push({
      time: formatTime(hours),
      tideLevel: Math.round(tideLevel * 100) / 100,
      phase,
      isHighTide: isPeak,
      isLowTide: isValley,
    });

    prevLevel = tideLevel;
  }
  return tides;
}

function generateMixedTides(): TidePoint[] {
  const tides: TidePoint[] = [];
  const meanLevel = 2.3;
  const amp1 = 1.5;
  const amp2 = 0.6;
  const period1 = 12.42;
  const period2 = 12.0;
  const phase2 = Math.PI / 3;

  let prevLevel = meanLevel;
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const hours = (i * INTERVAL_MIN) / 60;
    const comp1 = amp1 * Math.sin((2 * Math.PI * hours) / period1 - Math.PI / 2);
    const comp2 = amp2 * Math.sin((2 * Math.PI * hours) / period2 - Math.PI / 2 + phase2);
    const tideLevel = meanLevel + comp1 + comp2;

    const nextHours = ((i + 1) * INTERVAL_MIN) / 60;
    const nextComp1 = amp1 * Math.sin((2 * Math.PI * nextHours) / period1 - Math.PI / 2);
    const nextComp2 = amp2 * Math.sin((2 * Math.PI * nextHours) / period2 - Math.PI / 2 + phase2);
    const nextLevel = meanLevel + nextComp1 + nextComp2;

    let phase: "rising" | "falling" | "slack" = "slack";
    if (Math.abs(tideLevel - prevLevel) > 0.005) {
      phase = tideLevel > prevLevel ? "rising" : "falling";
    }

    const isPeak = tideLevel > prevLevel && tideLevel > nextLevel + 0.005;
    const isValley = tideLevel < prevLevel && tideLevel < nextLevel - 0.005;

    tides.push({
      time: formatTime(hours),
      tideLevel: Math.round(tideLevel * 100) / 100,
      phase,
      isHighTide: isPeak,
      isLowTide: isValley,
    });

    prevLevel = tideLevel;
  }
  return tides;
}

function buildCorrectStrategy(tides: TidePoint[]): GateStrategyPoint[] {
  return tides.map((t) => ({
    time: t.time,
    openingPercent: t.phase === "falling" || t.isHighTide ? 100 : 0,
  }));
}

function buildWrongStrategy(tides: TidePoint[]): GateStrategyPoint[] {
  return tides.map((t) => ({
    time: t.time,
    openingPercent: t.phase === "rising" || t.isLowTide ? 100 : 0,
  }));
}

const defaultEfficiencyCurve: EfficiencyPoint[] = [
  { head: 0.5, efficiency: 0.4 },
  { head: 1.0, efficiency: 0.65 },
  { head: 1.5, efficiency: 0.82 },
  { head: 2.0, efficiency: 0.88 },
  { head: 2.5, efficiency: 0.9 },
  { head: 3.0, efficiency: 0.88 },
  { head: 4.0, efficiency: 0.8 },
];

const defaultUnitConfig: UnitConfig = {
  maxPower: 500,
  ratedFlow: 50,
  overheatThreshold: 95,
  vibrationThreshold: 8.5,
  overspeedThreshold: 160,
  efficiencyCurve: defaultEfficiencyCurve,
};

function buildScenario(
  id: string,
  name: string,
  tideType: "semidiurnal" | "diurnal" | "mixed",
  description: string,
  defaultTimezone: string,
  tides: TidePoint[],
  protectionRecords: ProtectionRecord[],
  unitConfig: UnitConfig
): ScenarioData {
  return {
    id,
    name,
    tideType,
    description,
    defaultTimezone,
    tides,
    correctStrategy: buildCorrectStrategy(tides),
    wrongStrategy: buildWrongStrategy(tides),
    protectionRecords,
    unitConfig,
  };
}

const scenarios: Record<string, ScenarioData> = {
  semidiurnal: buildScenario(
    "semidiurnal",
    "半日潮（典型沿海）",
    "semidiurnal",
    "周期约12小时25分钟，一日两涨两落，潮差2-4米，是我国沿海最常见的潮汐类型。",
    "Asia/Shanghai",
    generateSemidiurnalTides(),
    [
      {
        id: "semi-1",
        timestamp: "2025-01-15T14:00:00.000Z",
        type: "overheat",
        description: "机组定子温度超限",
        triggerValue: 96.8,
        threshold: 95,
        unit: "°C",
        action: "自动降负荷至50%",
        teachingNote: "机组长时间满负荷运行会导致温度升高。发电水头过大或持续满负荷4小时以上容易触发过温保护，此时应降低开度或停机冷却。",
      },
      {
        id: "semi-2",
        timestamp: "2025-01-15T03:30:00.000Z",
        type: "vibration",
        description: "机组振动幅值超限",
        triggerValue: 9.2,
        threshold: 8.5,
        unit: "mm/s",
        action: "发出警告，密切监视",
        teachingNote: "潮汐发电中水头过低时，水流紊乱会引起机组振动异常。这通常发生在潮汐刚换向的平潮期附近。",
      },
      {
        id: "semi-3",
        timestamp: "2025-01-15T09:15:00.000Z",
        type: "manual_override",
        description: "操作员临时调整闸门开度",
        triggerValue: 60,
        threshold: 100,
        unit: "%",
        action: "开度由100%下调至60%",
        teachingNote: "实际运营中，操作员会根据电网调度、天气预报和维护计划临时调整闸门策略。但要注意：随意改变开度可能损失大量发电机会。",
      },
    ],
    { ...defaultUnitConfig }
  ),

  diurnal: buildScenario(
    "diurnal",
    "全日潮（赤道附近）",
    "diurnal",
    "一日一涨一落，潮差较小，常见于南海部分海域和赤道附近港口。",
    "Asia/Shanghai",
    generateDiurnalTides(),
    [
      {
        id: "diur-1",
        timestamp: "2025-01-15T18:45:00.000Z",
        type: "overheat",
        description: "发电机绕组温度过高",
        triggerValue: 97.3,
        threshold: 95,
        unit: "°C",
        action: "自动停机冷却",
        teachingNote: "全日潮的发电时段更长（约12小时持续落潮），如果不间歇运行，机组容易过热。实际电站会设置多台机组轮班运行。",
      },
      {
        id: "diur-2",
        timestamp: "2025-01-15T07:00:00.000Z",
        type: "overspeed",
        description: "水轮机转速超限",
        triggerValue: 168,
        threshold: 160,
        unit: "r/min",
        action: "快速关闭导叶，投入制动",
        teachingNote: "如果水头突然升高（如遭遇风暴潮），水轮机转速会快速上升。超速保护会立即关闸并制动，这是防止飞车的关键保护。",
      },
    ],
    { ...defaultUnitConfig, maxPower: 300, ratedFlow: 40 }
  ),

  mixed: buildScenario(
    "mixed",
    "混合潮（过渡区域）",
    "mixed",
    "不规则半日潮与全日潮的混合形态，潮位曲线复杂，两个高潮高度可能明显不同。",
    "UTC",
    generateMixedTides(),
    [
      {
        id: "mix-1",
        timestamp: "2025-01-15T11:30:00.000Z",
        type: "manual_override",
        description: "因时区混淆导致闸门误操作",
        triggerValue: 8,
        threshold: 0,
        unit: "小时偏移",
        action: "纠正时区，重启计算",
        teachingNote: "潮汐表通常标注了时区（UTC或当地时间）。如果在上海（东八区）使用UTC时间的潮汐表，会把凌晨高潮误认为上午高潮，导致闸门策略完全错位。使用前务必确认时区标注！",
      },
      {
        id: "mix-2",
        timestamp: "2025-01-15T20:20:00.000Z",
        type: "vibration",
        description: "空化引起异常振动",
        triggerValue: 9.8,
        threshold: 8.5,
        unit: "mm/s",
        action: "降低开度，检查叶片",
        teachingNote: "混合潮的水位变化复杂，某些时段水头不足却强行开闸，容易导致水轮机空化（气泡冲击叶片），长期会损坏转轮叶片。",
      },
    ],
    { ...defaultUnitConfig, maxPower: 450 }
  ),
};

export { scenarios, BASE_DATE, INTERVAL_MIN, TOTAL_POINTS };
