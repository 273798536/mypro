export type AnomalyType =
  | 'date_misalignment'
  | 'scenario_duplicate'
  | 'negative_cashflow'
  | 'missing_rating'
  | 'outlier_amount'
  | 'invalid_date_format';

export interface BondHolding {
  bondCode: string;
  bondName: string;
  holdingAmount: number;
  rating: string;
  duration: number;
  yieldRate: number;
  issueDate: string;
  maturityDate: string;
  source: string;
  sourceLine: number;
}

export interface CashFlow {
  id: string;
  bondCode: string;
  flowDate: string;
  amount: number;
  flowType: 'coupon' | 'principal' | 'call' | 'put';
  scenarioId: string;
  source: string;
  sourceLine: number;
  anomaly?: AnomalyType;
  anomalyDesc?: string;
}

export interface RateScenario {
  id: string;
  name: string;
  rateOffset: number;
  yieldCurve: number[];
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionRecord {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  source: string;
  sourceLine: number;
  operator: string;
}

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  description: string;
  source: string;
  sourceLine: number;
  cashFlowId?: string;
  bondCode?: string;
  severity: 'warning' | 'error' | 'critical';
}

export interface SelectedBar {
  cashFlowId: string;
  screenPosition: { x: number; y: number };
}

export interface UIState {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  anomalyBarVisible: boolean;
  hoveredBarId: string | null;
  selectedBar: SelectedBar | null;
  isExporting: boolean;
}

export interface BondDataState {
  holdings: BondHolding[];
  cashFlows: CashFlow[];
  anomalies: AnomalyRecord[];
  correctionHistory: CorrectionRecord[];
  dataSource: string;
  isLoaded: boolean;
}

export interface ScenarioState {
  scenarios: RateScenario[];
  activeScenarioId: string | null;
}

export interface ValidationResult {
  valid: boolean;
  anomalies: AnomalyRecord[];
  totalRecords: number;
  anomalyCount: number;
}

export type ViewMode = 'amount' | 'duration' | 'yield';