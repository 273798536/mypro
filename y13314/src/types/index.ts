export interface FilterCriteria {
  startDate: string;
  endDate: string;
  minScore: number | null;
  maxScore: number | null;
  modelVersion: string;
  segments: string[];
  status: string;
}

export interface PageSummary {
  criteria: FilterCriteria;
  dataAsOf: string;
  totalSamples: number;
  passRate: number;
  avgScore: number;
  dataIntegrityStatus: 'complete' | 'partial' | 'suspended';
  lastUpdated: string;
  suspendedCount: number;
}

export type SampleStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Sample {
  id: string;
  customerId: string;
  customerName: string;
  segmentId: string;
  segmentName: string;
  applyDate: string;
  status: SampleStatus;
  isSuspended: boolean;
  suspendReason?: string;
  assignedTo?: string;
  latestScore: number;
  latestResult: 'pass' | 'fail';
  modelVersion: string;
  threshold: number;
  thresholdVersion: string;
  hasLateAttachment: boolean;
  referenceComplete: boolean;
  missingReferences?: string[];
}

export interface Feature {
  name: string;
  value: number;
  weight: number;
}

export interface ScoreRecord {
  id: string;
  sampleId: string;
  modelVersion: string;
  modelName: string;
  score: number;
  scoreDate: string;
  threshold: number;
  thresholdVersion: string;
  result: 'pass' | 'fail';
  operator: string;
  features: Feature[];
  note?: string;
}

export type AttachmentType = 'document' | 'image' | 'data';

export interface Attachment {
  id: string;
  sampleId: string;
  name: string;
  type: AttachmentType;
  uploadDate: string;
  uploadedBy: string;
  isLateArrival: boolean;
  linkedConclusionId?: string;
  description?: string;
}

export type ConclusionResult = 'approve' | 'reject' | 'suspend';

export interface Conclusion {
  id: string;
  sampleId: string;
  finalResult: ConclusionResult;
  explanation: string;
  conclusionDate: string;
  conclusionBy: string;
  referencedAttachmentIds: string[];
  referencedScoreIds: string[];
  isReferenceComplete: boolean;
  missingReferences: string[];
}

export interface ChangedFeature {
  name: string;
  oldWeight: number;
  newWeight: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ModelComparison {
  sampleId: string;
  oldModel: {
    version: string;
    score: number;
    result: string;
    threshold: number;
    topFeatures: Feature[];
  };
  newModel: {
    version: string;
    score: number;
    result: string;
    threshold: number;
    topFeatures: Feature[];
  };
  scoreDiff: number;
  changedFeatures: ChangedFeature[];
  explanation: string;
}

export interface TimelineEvent {
  id: string;
  type: 'score' | 'attachment' | 'conclusion' | 'threshold_change' | 'suspend' | 'confirm';
  date: string;
  operator: string;
  description: string;
  detail?: string;
  status?: 'pass' | 'fail' | 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface ExportState {
  isExporting: boolean;
  exportType: 'pdf' | 'excel' | null;
  exportPreview: {
    summary: PageSummary | null;
    samples: Sample[];
    timestamp: string;
  } | null;
}

export interface AppState {
  filters: FilterCriteria;
  pageSummary: PageSummary | null;
  samples: Sample[];
  filteredSamples: Sample[];
  selectedSample: Sample | null;
  scoreRecords: ScoreRecord[];
  attachments: Attachment[];
  conclusions: Conclusion[];
  suspendedSamples: Sample[];
  exportState: ExportState;
  
  setFilters: (filters: Partial<FilterCriteria>) => void;
  resetFilters: () => void;
  updatePageSummary: () => void;
  
  selectSample: (id: string | null) => void;
  getSampleScoreRecords: (sampleId: string) => ScoreRecord[];
  getSampleAttachments: (sampleId: string) => Attachment[];
  getSampleConclusion: (sampleId: string) => Conclusion | undefined;
  getSampleTimeline: (sampleId: string) => TimelineEvent[];
  getModelComparison: (sampleId: string) => ModelComparison | null;
  
  suspendSample: (id: string, reason: string, assignee: string) => void;
  confirmSuspendedSample: (id: string) => void;
  checkSampleReferences: (sampleId: string) => { complete: boolean; missing: string[] };
  
  linkAttachmentToConclusion: (attachmentId: string, conclusionId: string) => void;
  addLateAttachment: (sampleId: string, attachment: Omit<Attachment, 'id' | 'sampleId' | 'isLateArrival'>) => void;
  
  startExport: (type: 'pdf' | 'excel') => void;
  completeExport: () => void;
  cancelExport: () => void;
  generateExportPreview: () => void;
}

export const DEFAULT_FILTERS: FilterCriteria = {
  startDate: '2025-01-01',
  endDate: '2025-06-18',
  minScore: null,
  maxScore: null,
  modelVersion: 'all',
  segments: [],
  status: 'all',
};

export const SEGMENTS = [
  { id: 'enterprise', name: '企业客户' },
  { id: 'personal', name: '个人客户' },
  { id: 'small_business', name: '小微企业' },
  { id: 'mortgage', name: '房贷客户' },
];

export const MODEL_VERSIONS = [
  { id: 'v2.1.0', name: '风控模型 v2.1.0 (当前)' },
  { id: 'v2.0.0', name: '风控模型 v2.0.0' },
  { id: 'v1.9.0', name: '风控模型 v1.9.0 (旧版)' },
];

export const THRESHOLD_VERSIONS = [
  { id: 'threshold_2025q2', name: '2025Q2阈值 (≥650通过)', threshold: 650 },
  { id: 'threshold_2025q1', name: '2025Q1阈值 (≥620通过)', threshold: 620 },
  { id: 'threshold_2024q4', name: '2024Q4阈值 (≥600通过)', threshold: 600 },
];
