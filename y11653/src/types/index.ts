export interface WaterQuality {
  cod: number;
  ammonia: number;
  totalPhosphorus: number;
  totalNitrogen: number;
  ph: number;
  turbidity: number;
}

export interface Thresholds {
  cod: number;
  ammonia: number;
  totalPhosphorus: number;
  totalNitrogen: number;
  ph: [number, number];
  turbidity: number;
}

export interface Chemical {
  id: string;
  name: string;
  type: 'coagulant' | 'flocculant' | 'phAdjuster' | 'nutrient';
  unitPrice: number;
  dosageRange: [number, number];
  efficiency: number;
  targetIndicators: (keyof WaterQuality)[];
  description: string;
}

export type AnomalyType = 'overdose' | 'insufficient_mixing' | 'rebound' | 'ph_extreme';

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  timestamp: number;
  severity: 'warning' | 'danger';
  message: string;
  suggestion: string;
}

export interface Operation {
  id: string;
  timestamp: number;
  chemicalId: string;
  dosage: number;
  mixingTime: number;
  cost: number;
  beforeQuality: WaterQuality;
  afterQuality: WaterQuality;
  anomalies: AnomalyType[];
  scoreChange: number;
}

export interface DataPoint {
  time: number;
  cod: number;
  ammonia: number;
  totalPhosphorus: number;
  totalNitrogen: number;
  ph: number;
  turbidity: number;
}

export type GameStatus = 'idle' | 'running' | 'finished';

export interface ScoreBreakdown {
  compliance: number;
  complianceMax: number;
  cost: number;
  costMax: number;
  operation: number;
  operationMax: number;
  total: number;
  totalMax: number;
  deductions: {
    reason: string;
    points: number;
  }[];
}

export interface GameState {
  status: GameStatus;
  currentTime: number;
  totalTime: number;
  inletWater: WaterQuality;
  currentWater: WaterQuality;
  targetThresholds: Thresholds;
  operations: Operation[];
  historyData: DataPoint[];
  score: number;
  totalCost: number;
  selectedChemical: string | null;
  currentDosage: number;
  currentMixingTime: number;
  anomalies: AnomalyEvent[];
  reboundEffects: {
    indicator: keyof WaterQuality;
    remainingSteps: number;
    magnitude: number;
  }[];
}
