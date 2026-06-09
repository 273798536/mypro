export type SampleType = 'blank' | 'standard' | 'unknown' | 'qc';
export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
export type IssueSeverity = 'critical' | 'warning' | 'info';
export type RecordStatus = 'valid' | 'invalid' | 'review_needed' | 'expired';

export interface TemperaturePoint {
  time: string;
  temperature: number;
}

export interface ReagentRecord {
  reagentId: string;
  reagentName: string;
  batchNumber: string;
  concentration: string;
  expiryDate: string;
  openedDate?: string;
  storageCondition: string;
  status: RecordStatus;
  manualNote?: string;
  handoverRemark?: string;
}

export interface CVExperiment {
  experimentId: string;
  batchId: string;
  sampleId: string;
  sampleName: string;
  sampleType: SampleType;
  operator: string;
  experimentDate: string;
  startTime?: string;
  endTime?: string;
  potentialStart: number;
  potentialEnd: number;
  scanRate: number;
  cycles: number;
  workingElectrode?: string;
  referenceElectrode?: string;
  counterElectrode?: string;
  electrolyte?: string;
  temperaturePoints?: TemperaturePoint[];
  peakCurrent?: number;
  peakPotential?: number;
  status: ExperimentStatus;
  reagentIds: string[];
  manualNote?: string;
  rawData?: {
    potential: number[];
    current: number[];
  };
}

export interface Issue {
  issueId: string;
  batchId: string;
  experimentId?: string;
  type: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  studentExplanation: string;
  suggestion?: string;
  affectedRecords: string[];
  detectedAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedNote?: string;
}

export interface BatchSummary {
  batchId: string;
  totalExperiments: number;
  blankCount: number;
  standardCount: number;
  unknownCount: number;
  hasBlankControl: boolean;
  hasTemperatureCurve: boolean;
  issues: Issue[];
  retestSuggestion?: string;
  status: 'ok' | 'warning' | 'blocked';
  lastUpdated: string;
}

export interface DataSource {
  experiments: CVExperiment[];
  reagents: ReagentRecord[];
  batches: BatchSummary[];
  issues: Issue[];
  importedAt: string;
  sourceFileName?: string;
}

export interface ExportReport {
  generatedAt: string;
  batchSummary: BatchSummary[];
  criticalIssues: Issue[];
  blockedBatches: string[];
  invalidRecords: {
    experiments: string[];
    reagents: ReagentRecord[];
  };
  handoverChecklist: string[];
}
