export type TideType = "semidiurnal" | "diurnal" | "mixed";

export type StrategyType = "correct" | "wrong" | "custom";

export type TidePhase = "rising" | "falling" | "slack";

export type CalcPhase = "generating" | "storing" | "idle" | "discarding";

export type AlertLevel = "info" | "warning" | "danger" | "shutdown";

export interface Scenario {
  id: string;
  name: string;
  tideType: TideType;
  description: string;
  defaultTimezone?: string;
}

export interface TidePoint {
  time: string;
  tideLevel: number;
  phase: TidePhase;
  isHighTide: boolean;
  isLowTide: boolean;
}

export interface TideDataResponse {
  scenarioId: string;
  timezone: string;
  timezoneOffset: number;
  timezoneWarning?: string;
  data: TidePoint[];
}

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
  phase: CalcPhase;
  efficiency: number;
  unitTemp: number;
  alerts: TimelineAlert[];
  isHighTide?: boolean;
  isLowTide?: boolean;
}

export interface WaterDiscarded {
  startTime: string;
  endTime: string;
  volume: number;
  reason: string;
}

export interface GlobalAlert {
  level: AlertLevel;
  message: string;
  code: string;
  timestamp: string;
  detail: string;
}

export interface CalcResult {
  totalEnergy: number;
  peakPower: number;
  averageEfficiency: number;
  waterDiscarded: WaterDiscarded[];
  timeline: TimelinePoint[];
  alerts: GlobalAlert[];
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

export interface GateOverrideRequest {
  time: string;
  openingPercent: number;
  reason?: string;
}

export interface GateOverrideResponse {
  success: boolean;
  warning?: string;
  impact: {
    energyDelta: number;
    riskLevel: "none" | "low" | "medium" | "high";
  };
  alert?: {
    level: AlertLevel;
    message: string;
    teachingNote: string;
  };
}

export interface GateStrategyPoint {
  time: string;
  openingPercent: number;
}

export interface CalculateRequest {
  scenarioId: string;
  strategy: StrategyType;
  customGates?: GateStrategyPoint[];
  timezone?: string;
}

export interface ReportSegment {
  startTime: string;
  endTime: string;
  label: string;
  recommendation: string;
  energy: number;
  avgPower: number;
  events: Array<{ time: string; type: string; description: string }>;
}

export interface Report {
  summary: {
    totalEnergy: number;
    peakPower: number;
    averageEfficiency: number;
    totalWaterDiscarded: number;
    alertCount: { info: number; warning: number; danger: number; shutdown: number };
  };
  segments: ReportSegment[];
  teachingNotes: Array<{ title: string; content: string }>;
  strategyLabel: string;
}
