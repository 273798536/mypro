export type ConcentrationUnit = 'mol/L' | 'g/L' | 'mass_fraction';

export type AnomalyType =
  | 'ph_out_of_range'
  | 'concentration_error'
  | 'temperature_abnormal'
  | 'formula_error';

export type AnomalySeverity = 'warning' | 'error' | 'critical';

export type BatchStatus = 'draft' | 'calculating' | 'completed' | 'has_anomaly';

export type ResultType =
  | 'solubility_curve'
  | 'balancing'
  | 'concentration_conversion';

export interface WeighingRecord {
  id: string;
  recordNumber: string;
  operator: string;
  weight: number;
  weighedAt: number;
  remarks: string;
}

export interface HandlingOpinion {
  id: string;
  content: string;
  handler: string;
  handledAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Reagent {
  id: string;
  name: string;
  formula?: string;
  molarMass?: number;
  concentration: number;
  concentrationUnit: ConcentrationUnit;
  temperature: number;
  phValue: number;
  solubility?: number;
  weighingRecordId?: string;
  weighingRecord?: WeighingRecord;
}

export interface SafetyNote {
  id: string;
  contentHash: string;
  content: string;
  author: string;
  createdAt: number;
}

export interface Anomaly {
  id: string;
  reagentId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  userFriendlyMessage: string;
  actualValue: number;
  expectedMin?: number;
  expectedMax?: number;
  handlingOpinionId?: string;
  handlingOpinion?: HandlingOpinion;
}

export interface CalculationResult {
  id: string;
  batchId: string;
  type: ResultType;
  rawData: Record<string, unknown>;
  explanation: string;
  detailedExplanation?: string;
  calculatedAt: number;
}

export interface BatchRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  operator: string;
  reagents: Reagent[];
  safetyNotes: SafetyNote[];
  status: BatchStatus;
}

export interface SolubilityPoint {
  temperature: number;
  solubility: number;
}

export interface BalancingEquation {
  reactants: string[];
  products: string[];
  coefficients: number[];
  balanced: boolean;
}

export interface ConversionResult {
  fromUnit: ConcentrationUnit;
  toUnit: ConcentrationUnit;
  fromValue: number;
  toValue: number;
  molarMass?: number;
  density?: number;
}

export interface TraceNode {
  id: string;
  type: 'anomaly' | 'reagent' | 'weighing' | 'opinion';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface TraceChain {
  anomalyId: string;
  nodes: TraceNode[];
}
