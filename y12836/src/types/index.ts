export type SampleStatus =
  | 'pending'
  | 'estimating'
  | 'estimated'
  | 'corrected'
  | 'confirmed'
  | 'exported'
  | 'anomaly';

export interface PatientInfo {
  age?: number;
  gender?: 'male' | 'female';
  diagnosis?: string;
  tissueType?: string;
  lesionSite?: string;
}

export interface Sample {
  id: string;
  barcode: string;
  groupId: string;
  patientInfo: PatientInfo;
  collectedAt: string;
  receivedAt: string;
  status: SampleStatus;
  currentVersion: number;
  latestPositiveRate?: number;
  latestConclusion?: string;
  createdAt: string;
  updatedAt: string;
  hasAnomaly?: boolean;
}

export interface EstimationVersion {
  id: string;
  sampleId: string;
  version: number;
  positiveRate: number;
  confidenceInterval: [number, number];
  algorithm: string;
  algorithmVersion: string;
  parameters: Record<string, any>;
  cellCount?: number;
  positiveCellCount?: number;
  tissueArea?: number;
  stainingIntensity?: 'weak' | 'moderate' | 'strong';
  estimatedAt: string;
  estimatedBy: 'ai' | 'human' | 'hybrid';
  conclusion: string;
  processingOpinion?: string;
}

export interface Correction {
  id: string;
  sampleId: string;
  versionId: string;
  originalRate: number;
  correctedRate: number;
  reason: string;
  note: string;
  correctedBy: string;
  correctedAt: string;
}

export interface PathologyNote {
  id: string;
  sampleId: string;
  content: string;
  author: string;
  createdAt: string;
  previousVersionId?: string;
  isLatest: boolean;
}

export type SignificanceLevel =
  | 'pathogenic'
  | 'likely_pathogenic'
  | 'uncertain'
  | 'likely_benign'
  | 'benign';

export interface SequencingResult {
  id: string;
  sampleId: string;
  gene: string;
  variant: string;
  significance: SignificanceLevel;
  alleleFrequency?: number;
  readDepth?: number;
  chromosome?: string;
  position?: number;
  data: Record<string, any>;
  testedAt: string;
  reportId?: string;
}

export type LineageEventType =
  | 'created'
  | 'estimated'
  | 're_estimated'
  | 'corrected'
  | 'note_updated'
  | 'sequencing_added'
  | 'status_changed'
  | 'exported'
  | 'confirmed'
  | 'anomaly_detected'
  | 'anomaly_resolved';

export interface LineageEvent {
  id: string;
  sampleId: string;
  eventType: LineageEventType;
  description: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  operator: string;
  timestamp: string;
  versionId?: string;
}

export type AnomalyType = 'duplicate_barcode' | 'missing_data' | 'outlier';
export type AnomalyStatus = 'detected' | 'processing' | 'resolved';
export type AnomalyStepName = 'rerun' | 'supplement' | 'confirm';
export type StepStatus = 'pending' | 'in_progress' | 'completed';

export interface AnomalyStep {
  id: string;
  stepNumber: 1 | 2 | 3;
  stepName: AnomalyStepName;
  status: StepStatus;
  result?: string;
  operator?: string;
  completedAt?: string;
  note?: string;
}

export interface AnomalyRecord {
  id: string;
  barcode: string;
  type: AnomalyType;
  status: AnomalyStatus;
  sampleIds: string[];
  steps: AnomalyStep[];
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  finalConclusion?: string;
}

export interface ExportRecord {
  id: string;
  sampleId: string;
  versionId: string;
  conclusionBefore: string;
  conclusionAfter: string;
  positiveRateBefore?: number;
  positiveRateAfter?: number;
  format: 'pdf' | 'excel' | 'print';
  exportedBy: string;
  exportedAt: string;
  reportTitle: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  color: string;
  sampleCount?: number;
}

export interface ProcessingOpinionTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface DashboardStats {
  totalSamples: number;
  pendingEstimation: number;
  anomalies: number;
  completedToday: number;
  trendData: { date: string; count: number }[];
  groupDistribution: { name: string; count: number; color: string }[];
  recentActivity: LineageEvent[];
}

export interface NoteComparison {
  sampleId: string;
  oldNoteId: string;
  newNoteId: string;
  oldContent: string;
  newContent: string;
  oldConclusion: string;
  newConclusion: string;
  oldPositiveRate: number;
  newPositiveRate: number;
  changedAt: string;
  changedBy: string;
  impactAnalysis: {
    affectedFields: string[];
    severity: 'low' | 'medium' | 'high';
    description: string;
  };
}
