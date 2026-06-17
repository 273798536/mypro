export type AnomalyType =
  | 'train_val_leakage'
  | 'duplicate_samples'
  | 'label_noise'
  | 'distribution_shift'
  | 'outlier';

export type AnomalyStatus = 'pending' | 'confirmed' | 'rejected' | 'fixed';

export type CorrectionAction = 'keep' | 'remove' | 'relabel' | 'move_split';

export type DataSplit = 'train' | 'val' | 'test';

export type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan';

export interface Batch {
  id: string;
  fingerprint: string;
  name: string;
  sourceFile: string;
  rawContent: string;
  parsedSamples: Omit<Sample, 'id' | 'runId' | 'clusterId'>[];
  importMetadata: {
    totalCount: number;
    trainCount: number;
    valCount: number;
    testCount: number;
    labels: string[];
    labelDistribution: Record<string, number>;
    duplicateCount: number;
    duplicateGroups: number;
  };
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
  clusterIndex: number;
  anomalyType: AnomalyType;
  sampleIds: string[];
  severityScore: number;
  size: number;
  representativeSampleId: string;
  summary: string;
}

export interface Anomaly {
  id: string;
  clusterId: string;
  sampleId: string;
  runId: string;
  status: AnomalyStatus;
  detectedAt: string;
  description: string;
  friendlyDescription: string;
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
