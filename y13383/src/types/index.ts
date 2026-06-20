export type SampleStatus = 'processed' | 'pending_material' | 'manual_review';
export type SampleCategory = 'normal' | 'boundary' | 'validation_pollution';
export type FailureType = 'metric_mismatch' | 'threshold' | 'label_error' | 'pollution' | 'unknown';
export type GrayFactor = 'sample_change' | 'threshold_change' | 'manual_override';

export interface MetricValue {
  offline: number;
  online: number;
  diffNote?: string;
  caliperAligned: boolean;
}

export interface EvidenceEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  timestamp: number;
}

export interface CompressionSample {
  id: string;
  batchId: string;
  modelVersion: string;
  name: string;
  category: SampleCategory;
  status: SampleStatus;
  failureType: FailureType;
  metrics: {
    accuracy?: MetricValue;
    latency?: MetricValue;
    cost?: MetricValue;
    [key: string]: MetricValue | undefined;
  };
  inputPreview: string;
  modelOutput: string;
  groundTruth: string;
  judgmentRule: string;
  originalStatement: EvidenceEntry[];
  processedBy?: string;
  processedNote?: string;
  grayFactor?: GrayFactor;
  createdAt: number;
}

export interface GrayBreakdownItem {
  factor: GrayFactor;
  delta: number;
  sampleIds: string[];
  description: string;
}

export interface HandoverChecklist {
  caliperAligned: boolean;
  boundaryMarked: boolean;
  pollutionIsolated: boolean;
  grayBreakdownReady: boolean;
}

export interface CompressionBatch {
  id: string;
  version: string;
  name: string;
  baselineVersion?: string;
  overallMetrics: {
    offlineAccuracy: number;
    onlineAccuracy: number;
    processedCount: number;
    pendingCount: number;
    manualCount: number;
    pollutionCount: number;
  };
  samples: CompressionSample[];
  grayBreakdown: GrayBreakdownItem[];
  handoverChecklist: HandoverChecklist;
}

export interface TrendPoint {
  version: string;
  offline: number;
  online: number;
}
