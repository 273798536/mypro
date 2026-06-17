export type MaterialType = 'resident_feedback' | 'attachment' | 'verbal_note';

export type AnomalyType = 
  | 'wrong_intersection' 
  | 'duplicate_complaint' 
  | 'bad_data' 
  | 'version_conflict'
  | 'late_attachment'
  | 'data_inconsistency';

export type ReviewStatus = 'pending' | 'reviewing' | 'completed' | 'needs_manual';

export interface RawDataReference {
  source: string;
  lineNumber?: number;
  fieldName?: string;
  originalValue: string;
}

export interface MaterialVersion {
  id: string;
  version: number;
  content: string;
  uploadTime: Date;
  uploader: string;
  isLateArrival: boolean;
  note?: string;
}

export interface Material {
  id: string;
  type: MaterialType;
  title: string;
  fileName?: string;
  parkName: string;
  versions: MaterialVersion[];
  currentVersion: number;
  tags: string[];
}

export interface ComplaintRecord {
  id: string;
  materialId: string;
  versionId: string;
  street: string;
  intersection?: string;
  complaintType: string;
  description: string;
  seatCount?: number;
  reportedTime: Date;
  reporter: string;
  rawReference: RawDataReference;
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
  anomalyNote?: string;
}

export interface VersionDiff {
  versionFrom: number;
  versionTo: number;
  changedFields: {
    field: string;
    oldValue: string;
    newValue: string;
    impact: 'low' | 'medium' | 'high';
  }[];
  overallImpact: 'low' | 'medium' | 'high';
  summary: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  relatedRecordIds: string[];
  relatedMaterialIds: string[];
  rawReferences: RawDataReference[];
  suggestion: string;
  requiresManualReview: boolean;
}

export interface MergeSuggestion {
  id: string;
  recordIds: string[];
  street: string;
  intersection?: string;
  reason: string;
  confidence: number;
  suggestedAction: 'merge' | 'keep_separate' | 'review';
}

export interface LateAttachmentImpact {
  id: string;
  attachmentId: string;
  attachmentTitle: string;
  uploadDelayHours: number;
  affectedRecords: string[];
  impactChain: {
    step: number;
    description: string;
    affectedField?: string;
    beforeValue?: string;
    afterValue?: string;
  }[];
  conclusionChange: string;
  originalConclusion: string;
  revisedConclusion: string;
}

export interface ReviewResult {
  id: string;
  parkName: string;
  reviewTime: Date;
  materials: Material[];
  complaints: ComplaintRecord[];
  anomalies: Anomaly[];
  mergeSuggestions: MergeSuggestion[];
  lateAttachmentImpacts: LateAttachmentImpact[];
  versionDiffs: VersionDiff[];
  seatCapacity: {
    designed: number;
    reported: number;
    verified: number;
    discrepancy: number;
  };
  conclusion: string;
  status: ReviewStatus;
  requiresManualNote: string;
}

export interface ParsedData {
  complaints: ComplaintRecord[];
  rawLines: string[];
  parseErrors: {
    line: number;
    content: string;
    error: string;
  }[];
}
