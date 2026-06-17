export type SampleStatus = 'train' | 'val' | 'test' | 'leak' | 'duplicate' | 'dirty';
export type LabelJudgment = 'positive' | 'negative' | 'neutral' | 'uncertain';
export type VersionStatus = 'staging' | 'grayscale' | 'production' | 'rollback';
export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface SourceMaterial {
  id: string;
  name: string;
  type: 'old_table' | 'shared_drive' | 'evaluation_question_bank' | 'supplementary_note' | 'manual_correction';
  location: string;
  lastModified: string;
  owner: string;
}

export interface ManualCorrection {
  id: string;
  timestamp: string;
  operator: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  source: string;
}

export interface TrainingSample {
  id: string;
  sampleNo: string;
  content: string;
  label: LabelJudgment;
  originalLabel?: LabelJudgment;
  status: SampleStatus;
  sourceMaterialId: string;
  sourceRow?: number;
  groupKey: string;
  unit?: string;
  rawValue: string;
  normalizedValue?: string;
  manualCorrections: ManualCorrection[];
  annotations: string[];
  createdAt: string;
  updatedAt: string;
  flagged?: boolean;
  flagReason?: string;
  duplicatesOf?: string;
  appearsInSets: string[];
}

export interface GroupMetric {
  groupKey: string;
  groupName: string;
  totalSamples: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  precision?: number;
  recall?: number;
  f1?: number;
  accuracy?: number;
  sampleIds: string[];
}

export interface ModelVersion {
  id: string;
  versionName: string;
  createdAt: string;
  createdBy: string;
  status: VersionStatus;
  parentVersionId?: string;
  description: string;
  trainSampleCount: number;
  valSampleCount: number;
  testSampleCount: number;
  overallAccuracy: number;
  overallPrecision: number;
  overallRecall: number;
  overallF1: number;
  sampleChanges: {
    sampleId: string;
    field: string;
    oldValue: string;
    newValue: string;
    changeType: ChangeType;
    affectsJudgment: boolean;
  }[];
  groupMetrics: GroupMetric[];
  flaggedSamples: string[];
  rollbackReason?: string;
  grayscalePercent?: number;
  grayscaleStartAt?: string;
  grayscaleEndAt?: string;
}

export interface GrayscaleComparison {
  baseVersionId: string;
  targetVersionId: string;
  overallDiff: {
    accuracyDiff: number;
    precisionDiff: number;
    recallDiff: number;
    f1Diff: number;
  };
  judgmentChangedSamples: {
    sampleId: string;
    baseLabel: LabelJudgment;
    targetLabel: LabelJudgment;
    reason: string;
    rootChangeField: string;
  }[];
  groupDiffs: {
    groupKey: string;
    baseAccuracy?: number;
    targetAccuracy?: number;
    accuracyDiff: number;
  }[];
}

export interface TraceStep {
  stepNo: number;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  meta: { key: string; value: string }[];
}

export interface BoundaryCase {
  id: string;
  title: string;
  description: string;
  category: 'dirty_duplicate' | 'train_val_leak' | 'missing_unit' | 'supplementary_note' | 'old_table_format';
  severity: 'high' | 'medium' | 'low';
  beforeState: Record<string, string>;
  afterState: Record<string, string>;
  judgmentChanged: boolean;
  oldJudgment: LabelJudgment;
  newJudgment: LabelJudgment;
  traceChain: TraceStep[];
  materialRef: string;
  rootCause: string;
  impactSummary: string;
}

export interface ReviewReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  versionsCompared: string[];
  summary: string;
  boundaryCases: BoundaryCase[];
  totalDirtySamples: number;
  totalLeakSamples: number;
  totalDuplicateGroups: number;
  judgmentFlipCount: number;
  recommendations: string[];
}
