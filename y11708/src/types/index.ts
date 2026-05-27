export interface UserState {
  id: string;
  name: string;
  description: string;
  color: string;
  isAbsorbing?: boolean;
}

export interface TransitionRecord {
  id: string;
  fromState: string;
  toState: string;
  count: number;
  channel?: string;
  campaignTag?: string;
  period: string;
  source: string;
}

export interface TransitionMatrix {
  states: UserState[];
  matrix: number[][];
  counts: number[][];
  sampleSizes: number[];
}

export interface PredictionResult {
  month: string;
  initialDistribution: number[];
  predictedDistribution: number[];
  activeRate: number;
  churnRate: number;
  confidenceInterval?: [number, number];
  explanation: string;
}

export type RiskType = 'low_sample' | 'channel_mixed' | 'absorbing_misuse';

export interface RiskDetection {
  type: RiskType;
  severity: 'warning' | 'error';
  message: string;
  details: Record<string, any>;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  operator: string;
  action: string;
  beforeData: any;
  afterData: any;
  source: string;
  remark?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  matrix: TransitionMatrix;
  prediction: PredictionResult;
  createdAt: number;
  description?: string;
}

export interface Filters {
  channels: string[];
  campaignTags: string[];
  targetMonth: string;
}

export interface AppState {
  states: UserState[];
  transitions: TransitionRecord[];
  matrix: TransitionMatrix | null;
  prediction: PredictionResult | null;
  filters: Filters;
  risks: RiskDetection[];
  history: HistoryRecord[];
  scenarios: SimulationScenario[];
  activeScenario: string | null;
  dataSource: string;
}

export interface ReportConfig {
  includeMatrix: boolean;
  includePrediction: boolean;
  includeRisks: boolean;
  includeHistory: boolean;
  format: 'pdf' | 'excel';
  remark: string;
}
