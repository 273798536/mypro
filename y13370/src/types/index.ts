export type EventType = 'sample' | 'version' | 'threshold' | 'correction' | 'metric' | 'failure' | 'feature';
export type FailureLevel = 'error' | 'critical' | 'warning';
export type RiskLevel = 'high' | 'medium' | 'low';
export type ConsistencyStatus = 'consistent' | 'inconsistent' | 'pending';
export type GroupStatus = 'open' | 'analyzing' | 'resolved' | 'noted';
export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface ModelVersion {
  id: string;
  versionCode: string;
  releaseTime: string;
  thresholdConfig: Record<string, number>;
  metrics: Record<string, number>;
  prevVersionId: string | null;
}

export interface TrainingTask {
  id: string;
  taskName: string;
  versionId: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string | null;
  sampleBatchId: string;
}

export interface FailureLog {
  id: string;
  taskId: string;
  level: FailureLevel;
  message: string;
  occurTime: string;
  stackTrace: string;
  relatedSampleIds: string[];
}

export interface CausalLink {
  from: string;
  to: string;
  description: string;
}

export interface FailureGroup {
  id: string;
  title: string;
  logIds: string[];
  causalChain: CausalLink[];
  status: GroupStatus;
  taskIds: string[];
}

export interface SampleRecord {
  id: string;
  batchId: string;
  count: number;
  source: string;
  ingestTime: string;
  versionId: string;
  distribution: Record<string, number>;
}

export interface ManualCorrection {
  id: string;
  groupId: string;
  operator: string;
  originalJudgment: string;
  newJudgment: string;
  createTime: string;
  reason: string;
}

export interface PublicNote {
  id: string;
  groupId: string;
  content: string;
  changedJudgments: string[];
  createTime: string;
  operator: string;
}

export interface TimelineEvent {
  id: string;
  eventType: EventType;
  refId: string;
  title: string;
  description: string;
  eventTime: string;
  fileStatusHash: string;
  pageStatusHash: string;
  isConsistent: ConsistencyStatus;
  metadata: Record<string, unknown>;
}

export interface LateFeature {
  id: string;
  featureName: string;
  delaySeconds: number;
  originalBatchId: string;
  actualBatchId: string;
  taskId: string;
  mixedInNormal: boolean;
  riskLevel: RiskLevel;
  occurTime: string;
  impactDescription: string;
}

export interface CompareDiffItem<T = unknown> {
  key: string;
  previous: T | null;
  current: T | null;
  changeType: ChangeType;
  deltaPercent?: number;
}

export interface VersionCompareReport {
  versionPair: { previous: string; current: string };
  samples: CompareDiffItem[];
  thresholds: CompareDiffItem<number>[];
  corrections: CompareDiffItem[];
  metrics: CompareDiffItem<number>[];
}

export interface ConsistencyReport {
  total: number;
  consistent: number;
  inconsistent: number;
  pending: number;
  inconsistentIds: string[];
  summary: string;
}
