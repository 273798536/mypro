export enum SampleStatus {
  AVAILABLE = 'available',
  REVIEWING = 'reviewing',
  INVALID = 'invalid',
}

export enum QualityLevel {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export interface Sample {
  id: string;
  barcode: string;
  name: string;
  material: string;
  collector: string;
  collectionTime: Date;
  status: SampleStatus;
  qualityLevel: QualityLevel;
  groupId?: string;
  invalidReason?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface SampleVersion {
  id: string;
  sampleId: string;
  version: number;
  data: Sample;
  changeReason: string;
  operator: string;
  createdAt: Date;
}

export interface ManualCorrection {
  id: string;
  sampleId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  corrector: string;
  correctedAt: Date;
  isRollback: boolean;
}

export interface PathologyNote {
  id: string;
  sampleId: string;
  barcode: string;
  content: string;
  pathologist: string;
  noteTime: Date;
  isConflict: boolean;
}

export interface Group {
  id: string;
  name: string;
  type: 'control' | 'experimental';
  description: string;
  createdBy: string;
  sampleIds: string[];
}

export interface BarcodeConflict {
  barcode: string;
  samples: Sample[];
  detectedAt: Date;
  resolution?: 'keep_newest' | 'keep_oldest' | 'merge' | 'mark_invalid';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ActionableError {
  errorCode: string;
  title: string;
  description: string;
  missingItems: Array<{
    sampleId: string;
    sampleName: string;
    issue: string;
  }>;
  nextSteps: string[];
  contactInfo?: {
    name: string;
    role: string;
  };
  canSkip: boolean;
  skipLabel?: string;
}

export interface StudentSampleView {
  sample: Sample;
  statusInfo: {
    icon: string;
    color: string;
    title: string;
    description: string;
  };
  canUseDirectly: boolean;
  needsReview: boolean;
  reviewNotes: string[];
  learningPath: LearningStep[];
}

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}

export type ConflictResolution = 'keep_newest' | 'keep_oldest' | 'merge' | 'mark_invalid';
