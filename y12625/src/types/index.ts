export interface Point {
  x: number;
  y: number;
}

export type LevelStatus = 'locked' | 'unlocked' | 'completed' | 'failed';

export interface Level {
  id: string;
  name: string;
  description: string;
  gridSize: number;
  targetFunction: string;
  boundary: { x: number; y: number };
  backgroundImage?: string;
  status: LevelStatus;
}

export type AnnotationType = 'curve' | 'region';
export type AnnotationStatus = 'valid' | 'pending_review';
export type IssueType = 'empty_value' | 'duplicate' | 'mixed_note' | 'out_of_boundary';

export interface AnnotationIssue {
  type: IssueType;
  description: string;
  sourceReference: string;
}

export interface Annotation {
  id: string;
  levelId: string;
  type: AnnotationType;
  color: string;
  points: Point[];
  status: AnnotationStatus;
  note: string;
  sourceMaterial: string;
  issues: AnnotationIssue[];
}

export type OperationType = 'draw' | 'color' | 'delete' | 'modify';

export interface Operation {
  id: string;
  type: OperationType;
  annotationId: string;
  beforeState: Partial<Annotation>;
  afterState: Partial<Annotation>;
  timestamp: number;
}

export interface ExperimentResult {
  id: string;
  levelId: string;
  passed: boolean;
  annotations: Annotation[];
  validCount: number;
  pendingCount: number;
  exportData: ExportData;
  completedAt: number;
}

export interface ExportData {
  version: string;
  experimentId: string;
  summary: {
    totalAnnotations: number;
    validCount: number;
    pendingCount: number;
    boundaryFailed: boolean;
  };
  annotations: Annotation[];
  exportedAt: number;
}

export type ToolType = 'select' | 'draw' | 'fill' | 'erase';
