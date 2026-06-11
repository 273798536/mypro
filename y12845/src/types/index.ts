export type BatchStatus = 'pending' | 'reviewing' | 'approved' | 'needs_review';

export type SampleStatus = 'normal' | 'contaminated' | 'corrected';

export interface GroupStat {
  groupName: string;
  sampleCount: number;
  avgSurvivalRate: number;
  stdDev: number;
  minValue: number;
  maxValue: number;
}

export interface CorrectionRecord {
  id: string;
  fieldName: string;
  oldValue: number;
  newValue: number;
  reason: string;
  operator: string;
  timestamp: string;
}

export interface PathologyNote {
  id: string;
  batchId: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface Batch {
  id: string;
  name: string;
  date: string;
  status: BatchStatus;
  reviewer?: string;
  conclusion?: string;
  batchEffectScore: number;
  batchEffectExplanation: string;
  groupStatistics: GroupStat[];
  pathologyNotes: PathologyNote[];
}

export interface Sample {
  id: string;
  batchId: string;
  sampleId: string;
  originalRowNumber: number;
  groupName: string;
  concentration: number;
  survivalRate: number;
  imageName: string;
  sourceNote: string;
  status: SampleStatus;
  contaminationReason?: string;
  correctionHistory?: CorrectionRecord[];
}

export interface LineageNode {
  id: string;
  type: 'conclusion' | 'group' | 'sample' | 'image' | 'source';
  label: string;
  children?: LineageNode[];
  metadata?: Record<string, any>;
}
