export type SampleStatus = 'normal' | 'boundary' | 'bad';
export type ReviewStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'flagged';
export type LineageStatus = 'active' | 'corrected' | 'superseded';

export interface RegionAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  category: 'tumor' | 'normal' | 'necrosis' | 'inflammation' | 'artifact' | 'other';
  confidence: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultivationRecord {
  id: string;
  sampleId: string;
  date: string;
  operator: string;
  action: 'passage' | 'medium_change' | 'treatment' | 'observation' | 'other';
  details: string;
  isSupplement: boolean;
  createdAt: string;
}

export interface LineageNode {
  id: string;
  sampleId: string;
  parentId: string | null;
  childIds: string[];
  generation: number;
  status: LineageStatus;
  correctedFromId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SequencingResult {
  id: string;
  sampleId: string;
  batchId: string;
  qualityScore: number;
  gcContent: number;
  coverageDepth: number;
  contaminationRate: number;
  batchEffectScore: number;
  batchEffectFlags: string[];
  pcaCoordinates: { pc1: number; pc2: number; pc3: number };
  createdAt: string;
}

export interface Sample {
  id: string;
  name: string;
  code: string;
  status: SampleStatus;
  reviewStatus: ReviewStatus;
  batchId: string;
  lineageId: string;
  receivedDate: string;
  species: string;
  tissueType: string;
  sliceThickness: number;
  stainingMethod: string;
  imageUrl: string;
  annotations: RegionAnnotation[];
  qualityScore: number;
  reviewer?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  unavailableReason?: string;
  isUnavailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchEffectReport {
  batchId: string;
  detected: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  affectedSamples: string[];
  pc1Variance: number;
  pc2Variance: number;
  clusteringPattern: string;
  possibleCauses: string[];
  recommendations: string[];
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  sampleId: string;
  reviewer: string;
  action: 'approve' | 'reject' | 'flag' | 'comment';
  notes: string;
  createdAt: string;
}

export interface MonthlyHandoverReport {
  month: string;
  totalSamples: number;
  reviewedSamples: number;
  pendingSamples: number;
  unavailableSamples: Sample[];
  unavailableReasons: { reason: string; count: number }[];
  flaggedSamples: Sample[];
  batchEffectIssues: BatchEffectReport[];
  summary: string;
  createdAt: string;
}
