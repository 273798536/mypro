export type SampleType = 'normal' | 'boundary' | 'gap';

export interface BatterySample {
  id: string;
  name: string;
  photoUrl: string;
  type: SampleType;
  internalResistance: number;
  temperature: number;
  testTime: string;
  soc: number;
  notes?: string;
  gapReason?: string;
}

export interface ParameterSet {
  id: string;
  name: string;
  version: string;
  baseResistance: number;
  baseTemperature: number;
  baseSoc: number;
  temperatureCoefficient: number;
  socCorrectionFactor: number;
  tolerance: number;
  updatedAt: string;
}

export interface ErrorComponent {
  id: string;
  name: string;
  value: number;
  percentage: number;
  formula: string;
  unitConversion?: string;
  description: string;
  calculation: string;
}

export interface AttributionResult {
  sampleId: string;
  parameterSetId: string;
  totalError: number;
  totalErrorPercentage: number;
  components: ErrorComponent[];
  conclusion: string;
  boundaryImpact?: string;
  isWithinTolerance: boolean;
}

export type HistoryType = 'import' | 'add_sample' | 'param_change' | 'confirm' | 'revert' | 'compare';

export interface HistoryRecord {
  id: string;
  timestamp: string;
  type: HistoryType;
  description: string;
  beforeSnapshot: AttributionResult | null;
  afterSnapshot: AttributionResult | null;
  operator: string;
}
