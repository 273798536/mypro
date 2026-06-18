export interface Sample {
  id: string;
  productId: string;
  productName: string;
  attributeName: string;
  attributeValue: string;
  originalStatement: string;
  isWithdrawn: boolean;
  withdrawnReason?: string;
  createdAt: string;
  createdBy: string;
}

export type PlaybackStatus = 'pending' | 'processing' | 'approved' | 'need_evidence';

export interface PlaybackResult {
  id: string;
  sampleId: string;
  sample?: Sample;
  confidenceScore: number;
  isMisjudgment: boolean;
  judgmentReason: string;
  missingReference: boolean;
  missingSampleIds: string[];
  evidenceChain: EvidenceItem[];
  status: PlaybackStatus;
  createdAt: string;
  operator?: string;
  remark?: string;
}

export type EvidenceType = 'sample' | 'rule' | 'leak';
export type Severity = 'low' | 'medium' | 'high';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  content: string;
  originalStatement?: string;
  sampleId?: string;
  severity: Severity;
}

export interface ReviewMetrics {
  totalSamples: number;
  accuracy: number;
  precision: number;
  recall: number;
  misjudgmentRate: number;
  withdrawnCount: number;
  topBiasingSamples: BiasingSample[];
}

export interface BiasingSample {
  sampleId: string;
  sample?: Sample;
  impactScore: number;
  reason: string;
  affectedMetrics: string[];
}

export interface StatusLog {
  id: string;
  playbackId: string;
  fromStatus: PlaybackStatus;
  toStatus: PlaybackStatus;
  operator: string;
  remark?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
