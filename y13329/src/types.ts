export type SourceType =
  | 'model_output_v1'
  | 'model_output_v2'
  | 'model_output_v3'
  | 'attachment_late'
  | 'verbal_note'
  | 'manual_override'
  | 'replay_historical';

export interface SourceMeta {
  sourceId: string;
  type: SourceType;
  label: string;
  receivedAt: string;
  operator?: string;
  rawPath?: string;
  sha256?: string;
}

export type ReferenceStatus = 'complete' | 'missing_primary' | 'missing_supporting' | 'conflicting';

export type VerdictLevel = 'positive' | 'neutral' | 'negative' | 'high_risk';

export interface Verdict {
  level: VerdictLevel;
  confidence: number;
  clusterId: string;
  summary: string;
  referenceStatus: ReferenceStatus;
  missingRefReasons?: string[];
}

export interface InfluenceFactor {
  sourceId: string;
  sourceType: SourceType;
  weight: number;
  contribution: string;
}

export interface Sample {
  sampleId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sources: SourceMeta[];
  verdict?: Verdict;
  previousVerdicts: Array<{
    at: string;
    verdict: Verdict;
    by: string;
    reason?: string;
  }>;
  influences: InfluenceFactor[];
  replayedFrom?: string;
  replayExplanation?: string;
  tags: string[];
}

export interface Batch {
  batchId: string;
  name: string;
  runAt: string;
  operator: string;
  sampleIds: string[];
  params: Record<string, unknown>;
  failures: Array<{
    sampleId?: string;
    stage: string;
    reason: string;
    detail?: Record<string, unknown>;
  }>;
}

export interface DashboardState {
  version: 2;
  lastUpdated: string;
  samples: Record<string, Sample>;
  batches: Record<string, Batch>;
  tags: Record<string, string[]>;
  counters: {
    sampleCount: number;
    batchCount: number;
  };
}

export interface HandoffSummary {
  generatedAt: string;
  operator: string;
  sampleDirectory: string;
  dataDirectory: string;
  exportGuide: Array<{ command: string; description: string }>;
  anomalies: Array<{
    sampleId: string;
    title: string;
    type: 'missing_ref' | 'late_attachment' | 'manual_override' | 'verdict_changed' | 'replay_mismatch';
    detail: string;
  }>;
  replayExplained: Array<{
    sampleId: string;
    title: string;
    explanation: string;
  }>;
}

export type ExportFormat = 'json' | 'csv' | 'json_split';
