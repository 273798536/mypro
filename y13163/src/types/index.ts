export type DataStatus = 'normal' | 'warning' | 'error' | 'processed';

export type AnomalyType = 'extreme' | 'noise' | 'drift' | 'missing';

export type AnomalyStatus = 'pending' | 'reviewed' | 'resolved';

export type NoteStatus = 'draft' | 'submitted' | 'verified';

export type RunStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface BuoyDataPoint {
  id: string;
  timestamp: string;
  waveHeight: number;
  wavePeriod: number;
  errorValue: number;
  attribution: string;
  status: DataStatus;
  source: string;
  anomalyIds?: string[];
}

export interface AnomalyPoint {
  id: string;
  dataId: string;
  type: AnomalyType;
  description: string;
  isSuspectedNoise: boolean;
  status: AnomalyStatus;
  attribution: string;
}

export interface MaintenanceNote {
  id: string;
  timestamp: string;
  content: string;
  source: string;
  status: NoteStatus;
  rawFields: Record<string, string>;
  relatedDataIds: string[];
}

export interface BoundaryValue {
  name: string;
  value: number;
  unit: string;
  description: string;
}

export interface FormulaVariable {
  symbol: string;
  name: string;
  unit: string;
  description: string;
}

export interface ParamVersion {
  version: string;
  formula: string;
  formulaDescription: string;
  variables: FormulaVariable[];
  description: string;
  boundaryValues: BoundaryValue[];
  createdAt: string;
}

export interface FilterState {
  dateRange: [string, string] | null;
  anomalyTypes: AnomalyType[];
  statuses: DataStatus[];
  showNoiseOnly: boolean;
  searchKeyword: string;
}
