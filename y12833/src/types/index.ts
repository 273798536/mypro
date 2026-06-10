export type ColdChainStatus = 'normal' | 'warning' | 'alert' | 'unknown';
export type SampleStatus = 'sampled' | 'in_transit' | 'sequencing' | 'analyzing' | 'completed' | 'archived';
export type ImportStrategy = 'skip' | 'overwrite' | 'merge' | 'manual';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface Sample {
  id: string;
  species: string;
  variety: string;
  status: SampleStatus;
  samplingTime: string;
  collector: string;
  coldChainStatus: ColdChainStatus;
}

export interface SamplingLocation {
  id: string;
  sampleId: string;
  latitude: number;
  longitude: number;
  placeName: string;
  temperature: number;
  humidity: number;
  elevation: number;
  gpsAccuracy: number;
}

export interface TimelineNode {
  stage: string;
  time: string;
  status: string;
  temperature?: number;
  location?: string;
}

export interface SequencingRun {
  id: string;
  sampleId: string;
  batchNo: string;
  geneLocus: string;
  sequencingDepth: number;
  qualityScore: number;
  gcContent: number;
  matchedSpecies: string;
  dataMd5: string;
  description: string;
  importTime: string;
  importOperator: string;
}

export interface PathologyNote {
  id: string;
  sampleId: string;
  content: string;
  imageAttachments: string[];
  createdAt: string;
  createdBy: string;
  linkedConclusionIds: string[];
}

export interface FinalConclusion {
  id: string;
  sampleId: string;
  judgment: string;
  issuer: string;
  issuedAt: string;
  linkedNoteIds: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAnnotation {
  id: string;
  sampleId: string;
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  labels: string[];
  confidences: number[];
  annotator: string;
  reviewStatus: ReviewStatus;
  reviewComment: string;
}

export interface DataImportLog {
  id: string;
  sampleId: string;
  runId: string | null;
  fileMd5: string;
  dataType: 'sequencing' | 'pathology' | 'annotation';
  importStatus: 'success' | 'duplicate' | 'conflict' | 'merged';
  conflictStrategy: ImportStrategy | null;
  conflictDetails: Record<string, { old: any; new: any }> | null;
  importTime: string;
  operator: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'exact_md5' | 'same_sample_batch' | 'none';
  existingRecordId: string | null;
  conflictingFields: string[];
}

export interface ConsistencyReport {
  totalChecked: number;
  duplicateConclusions: string[];
  orphanNotes: string[];
  orphanConclusions: string[];
  importAnomalies: string[];
  overallScore: number;
  generatedAt: string;
}

export interface AnnotationStandard {
  type: string;
  description: string;
  rule: string;
  color: string;
}

export interface ChangeLogEntry {
  id: string;
  entityType: 'note' | 'conclusion' | 'sequencing';
  entityId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  changedBy: string;
}
