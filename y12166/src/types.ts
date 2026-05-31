export interface SimParams {
  poolVolume: number;
  pumpFlow: number;
  initialChlorine: number;
  chlorineDecayRate: number;
  chlorineDoseAmount: number;
  visitorImpact: number;
  chlorineThreshold: number;
  visitorCurve: number[];
  pumpShutdownHours: number[];
}

export type ElectricityType = "peak" | "valley" | "flat";

export interface ElectricityPeriod {
  hour: number;
  type: ElectricityType;
  price: number;
}

export type AnomalyType = "low_chlorine" | "pump_shutdown" | "visitor_surge";

export interface AnomalyEvent {
  type: AnomalyType;
  hour: number;
  description: string;
  traceRef: {
    calculation: string;
    chlorinePrediction: string;
    scheduleAdvice: string;
  };
}

export interface HourlyResult {
  hour: number;
  chlorineLevel: number;
  chlorineBeforeDose: number;
  pumpRunning: boolean;
  pumpScheduled: boolean;
  electricityType: ElectricityType;
  electricityPrice: number;
  electricityCost: number;
  circulationVolume: number;
  visitorCount: number;
  visitorBaseline: number;
  anomaly: AnomalyEvent | null;
  chlorineDosed: boolean;
}

export interface SimSummary {
  totalCost: number;
  avgChlorine: number;
  minChlorine: number;
  minChlorineHour: number;
  cyclePeriod: number;
  dailyCycles: number;
  anomalyCount: number;
  anomalyTypes: Record<AnomalyType, number>;
  pumpFlowConclusion: string;
}

export interface SimResult {
  params: SimParams;
  electricitySchedule: ElectricityPeriod[];
  hourlyResults: HourlyResult[];
  summary: SimSummary;
}

export interface ScenarioPreset {
  name: string;
  label: string;
  description: string;
  params: Partial<SimParams>;
}
