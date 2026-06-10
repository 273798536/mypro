export enum SampleStatus {
  NORMAL = "normal",
  BORDERLINE = "borderline",
  ABNORMAL = "abnormal",
}

export enum ReviewAction {
  CONFIRM = "confirm",
  ADJUST = "adjust",
  REQUEST_RECHECK = "recheck",
}

export interface QualityMetric {
  name: string;
  shortName: string;
  value: number;
  thresholdMin: number;
  thresholdMax: number;
  unit: string;
  isOutOfRange: boolean;
  isBoundary: boolean;
  deviationPercent: number;
  explanation: string;
}

export interface ReviewNote {
  id: string;
  author: string;
  role: string;
  timestamp: number;
  content: string;
  action: ReviewAction;
  newStatus?: SampleStatus;
  updatesLineage: boolean;
}

export interface LineageNode {
  id: string;
  stage: string;
  operator: string;
  timestamp: number;
  statusBefore: SampleStatus | null;
  statusAfter: SampleStatus;
  note: string;
  relatedReviewId?: string;
}

export interface BatchEffectPoint {
  sampleId: string;
  pc1: number;
  pc2: number;
  batch: string;
  isOutlier: boolean;
  sigmaDistance: number;
  reason: string;
}

export interface PrimerSample {
  id: string;
  name: string;
  batch: string;
  location: string;
  collectionDate: string;
  operator: string;
  status: SampleStatus;
  autoDetectReason: string;
  blockReasonSummary: string;
  suggestions: string[];
  metrics: QualityMetric[];
  reviews: ReviewNote[];
  lineage: LineageNode[];
  batchEffect: BatchEffectPoint;
}

export type FilterStatus = SampleStatus | "all";
