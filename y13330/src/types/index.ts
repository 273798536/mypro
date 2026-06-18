export interface ModelVersion {
  id: string;
  name: string;
  description: string;
  importedAt: number;
  isBaseline: boolean;
}

export interface AttributeVersionOutput {
  value: string;
  confidence: number;
  evidence: string;
}

export interface AttributeOutput {
  name: string;
  versions: Record<string, AttributeVersionOutput>;
  manualValue?: string;
  finalValue?: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: number;
}

export type ReviewStatus = 'pending' | 'reviewing' | 'confirmed' | 'disputed';
export type LeakRiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Sample {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  category: string;
  isBoundary: boolean;
  reviewStatus: ReviewStatus;
  attributes: Record<string, AttributeOutput>;
  notes: Note[];
  leakRisk: LeakRiskLevel;
  leakReason?: string;
  createdAt: number;
  updatedAt: number;
}

export type HistoryType =
  | 'import'
  | 'review'
  | 'boundary_mark'
  | 'boundary_unmark'
  | 'note_add'
  | 'verdict_change'
  | 'leak_flag'
  | 'attribute_edit';

export interface HistoryRecord {
  id: string;
  type: HistoryType;
  sampleId?: string;
  sampleName?: string;
  operator: string;
  before: unknown;
  after: unknown;
  reason?: string;
  timestamp: number;
}

export interface ReviewSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed' | 'archived';
  currentSampleId: string | null;
  modelVersions: ModelVersion[];
  samples: Sample[];
  history: HistoryRecord[];
}

export interface VersionComparison {
  sampleId: string;
  changedAttributes: string[];
  addedAttributes: string[];
  removedAttributes: string[];
  confidenceChanges: Record<string, number>;
}

export interface ExplanationFactor {
  type: 'model_version' | 'manual_edit' | 'boundary_mark' | 'note';
  description: string;
  weight: number;
  timestamp: number;
  operator?: string;
}

export interface VerdictExplanation {
  sampleId: string;
  initialVerdict: string;
  currentVerdict: string;
  factors: ExplanationFactor[];
  summary: string;
}

export interface LeakGuidance {
  level: LeakRiskLevel;
  title: string;
  steps: string[];
  severity: 'info' | 'warning' | 'danger';
}
