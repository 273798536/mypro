export interface Complex {
  re: number;
  im: number;
}

export interface QuantumState {
  id: string;
  label: string;
  amplitudes: Complex[];
  importOrder: number;
  importTag: '先到' | '后补';
  basis: 'Z' | 'X' | 'Y';
}

export interface MeasurementBasis {
  id: string;
  label: string;
  symbol: string;
  eigenvectors: QuantumState[];
  importOrder: number;
  importTag: '先到' | '后补';
  color: string;
}

export interface MeasurementResult {
  id: string;
  stateId: string;
  basisId: string;
  outcomeIndex: number;
  outcomeLabel: string;
  probabilities: number[];
  isNormalized: boolean;
  randomSeed: number;
  seedInfluence: string;
  timestamp: number;
  stepIndex: number;
}

export type WarningType =
  | 'PROBABILITY_NOT_NORMALIZED'
  | 'BASIS_CONFUSION'
  | 'NO_EXPERIMENT_HISTORY';

export interface PendingConfirmation {
  id: string;
  type: WarningType;
  message: string;
  detail: string;
  relatedIds: string[];
  confirmed: boolean;
  createdAt: number;
}

export interface TimelineEntry {
  stepIndex: number;
  type:
    | 'IMPORT_STATE'
    | 'IMPORT_BASIS'
    | 'IMPORT_PROBABILITY'
    | 'SELECT_BASIS'
    | 'MEASURE'
    | 'CONFIRM_WARNING';
  entityId: string;
  description: string;
  randomSeed?: number;
  seedInfluence?: string;
}

export interface TraceIndex {
  forward: Record<string, string[]>;
  backward: Record<string, { stateId: string; basisId: string; stepIndex: number }>;
}

export interface GameSession {
  id: string;
  states: QuantumState[];
  bases: MeasurementBasis[];
  results: MeasurementResult[];
  warnings: PendingConfirmation[];
  timeline: TimelineEntry[];
  traceIndex: TraceIndex;
  startTime: number;
  endTime: number | null;
}

export type FeedbackType = 'success' | 'error' | 'info';

export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  detail: string;
  timestamp: number;
}
