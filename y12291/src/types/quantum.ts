export interface ValidationIssue {
  id: string;
  type: 'UNNORMALIZED_PROBABILITY' | 'PHASE_OVERFLOW' | 'BASIS_CONFUSION';
  severity: 'error' | 'warning';
  message: string;
  relatedField: string;
  relatedStateId: string;
  detectedAt: number;
  resolvedAt: number | null;
}

export interface ValidationStatus {
  isNormalized: boolean | null;
  normalizationDelta: number | null;
  isPhaseInRange: boolean;
  phaseOverflow: number | null;
  measurementBasisConfusion: boolean;
  issues: ValidationIssue[];
}

export interface MeasurementBasis {
  type: 'computational' | 'hadamard' | 'circular' | 'custom';
  customLabel?: string;
  axis: [number, number, number];
}

export interface ProbabilityBar {
  basis: string;
  value: number;
  confirmed: boolean;
  source: 'input' | 'calculated';
}

export interface TraceLink {
  from: string;
  to: string;
  relation: 'parameter-to-result' | 'result-to-basis' | 'basis-to-parameter';
  label: string;
}

export interface QuantumState {
  id: string;
  theta: number;
  phi: number;
  label: string;
  alpha: number;
  beta: number;
  normalizedProbability: number | null;
  measurementBasis: MeasurementBasis | null;
  probabilityBars: ProbabilityBar[];
  validationStatus: ValidationStatus;
  traceLinks: TraceLink[];
  createdAt: number;
  updatedAt: number;
  hasDataGap: boolean;
  dataGapFields: string[];
}
