export type AnomalyType =
  | 'train_val_leakage'
  | 'duplicate_cluster'
  | 'label_noise'
  | 'distribution_shift'
  | 'other';

export type AnomalyStatus = 'pending' | 'confirmed' | 'rejected' | 'fixed';

export type CorrectionAction = 'keep' | 'remove' | 'relabel' | 'move_split';

export type DataSplit = 'train' | 'val' | 'test';

export type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan';

export interface Batch {
  id: string;
  fingerprint: string;
  name: string;
  sourceFile: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  latestRunVersion?: number;
}

export interface ParamConfig {
  eps: number;
  minSamples: number;
  distanceMetric: DistanceMetric;
  featureColumns: string[];
}

export interface DedupStats {
  totalSamples: number;
  uniqueSamples: number;
  duplicateSamples: number;
  duplicateGroups: number;
}

export interface DistributionStats {
  trainSplit: number;
  valSplit: number;
  testSplit: number;
  byLabel: Record<string, number>;
}

export interface Run {
  id: string;
  batchId: string;
  version: number;
  promptVersion: string;
  executedAt: string;
  executedBy: string;
  dedupStats: DedupStats;
  distributionStats: DistributionStats;
  paramConfig: ParamConfig;
}

export interface Sample {
  id: string;
  runId: string;
  originalId: string;
  content: string;
  sourceSplit: DataSplit;
  isDuplicate: boolean;
  duplicateGroupId?: string;
  clusterId?: string;
  rawData: Record<string, any>;
}

export interface Cluster {
  id: string;
  runId: string;
  name: string;
  anomalyType: AnomalyType;
  sampleCount: number;
  severityScore: number;
  metrics: {
    precision?: number;
    recall?: number;
    leakageRatio?: number;
    overlapCount?: number;
    feature?: string;
    diff?: number;
    duplicateCount?: number;
    noiseCount?: number;
  };
}

export interface Anomaly {
  id: string;
  clusterId: string;
  sampleId: string;
  runId: string;
  batchId: string;
  title: string;
  description: string;
  friendlyDescription: string;
  status: AnomalyStatus;
  metadata: Record<string, any>;
}

export interface Correction {
  id: string;
  sampleId: string;
  anomalyId: string;
  runId: string;
  action: CorrectionAction;
  reason: string;
  operator: string;
  correctedAt: string;
  note: string;
}

export interface ParamValidationError {
  field: keyof ParamConfig | 'general';
  value: any;
  errorCode: string;
  message: string;
  suggestion: string;
  example?: any;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'import' | 'run' | 'cluster' | 'correction' | 'review';
  title: string;
  description: string;
  details?: Record<string, any>;
  operator?: string;
}

export interface ExportFormat {
  type: 'technical' | 'friendly';
  fileFormat: 'xlsx' | 'csv';
}
