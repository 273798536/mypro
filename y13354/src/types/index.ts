export interface Prediction {
  docId: string;
  score: number;
  rank: number;
}

export interface Sample {
  id: string;
  query: string;
  groundTruth: string;
  predictions: Prediction[];
  score: number;
  isHit: boolean;
  isContaminated: boolean;
  contaminationSource?: string;
  contributionToMetric: number;
  rawSnapshot?: Record<string, unknown>;
  latencyMs: number;
}

export type PassCondition = '>' | '<' | '>=' | '<=';

export interface MetricConfig {
  key: string;
  name: string;
  formula: string;
  formulaDetail: string;
  unit: string;
  defaultThreshold: number;
  passCondition: PassCondition;
  description: string;
  minValue?: number;
  maxValue?: number;
}

export interface MetricResult {
  key: string;
  name: string;
  formula: string;
  formulaDetail: string;
  unit: string;
  value: number;
  threshold: number;
  passCondition: PassCondition;
  isPassed: boolean;
  numerator: number;
  denominator: number;
}

export interface Note {
  id: string;
  snapshotId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  snapshotId: string;
  type: 'screenshot' | 'link';
  url: string;
  description: string;
  createdAt: string;
}

export interface ManualOverride {
  id: string;
  snapshotId: string;
  metricName: string;
  oldValue: string;
  newValue: string;
  oldPassed: boolean;
  newPassed: boolean;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  createdBy: string;
  description: string;
  samples: Sample[];
  notes: Note[];
  attachments: Attachment[];
  overrides: ManualOverride[];
}

export interface GatekeeperState {
  isDemoMode: boolean;
  currentSnapshot: Snapshot | null;
  snapshotHistory: Snapshot[];
  metricConfigs: MetricConfig[];
  metricResults: MetricResult[];
  overallPassed: boolean;
  hasOverride: boolean;
  selectedSample: Sample | null;
  showOverrideModal: boolean;
  overrideTarget: string | null;
}
