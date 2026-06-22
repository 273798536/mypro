export type DataIssueType = "normal" | "missing_field" | "alias" | "remark";

export type UnstableStatus = "pending" | "confirmed" | "rejected";

export interface SampleRecord {
  id: string;
  name: string;
  value?: number;
  category?: string;
  alias?: string;
  remark?: string;
  dataIssue: DataIssueType;
  filledValue?: number;
  filledCategory?: string;
}

export interface SamplingStep {
  stepIndex: number;
  title: string;
  description: string;
  params: Record<string, unknown>;
  affectedSampleIds: string[];
  resultDelta: string;
  note?: string;
  triggerUnstable?: boolean;
}

export interface UnstableRecord {
  id: string;
  sampleId: string;
  description: string;
  impactedMetrics: string[];
  reviewer: string;
  status: UnstableStatus;
  createdAt: string;
}

export interface ParamVersion {
  version: string;
  changedBy: string;
  changedAt: string;
  beforeParams: Record<string, unknown>;
  afterParams: Record<string, unknown>;
  changeNote: string;
}

export interface ChartPoint {
  x: number;
  y: number;
  sampleId?: string;
  isOutlier: boolean;
  label: string;
}

export interface SamplingResult {
  totalCount: number;
  sampledCount: number;
  sampleRate: number;
  meanValue: number;
  medianValue: number;
}
