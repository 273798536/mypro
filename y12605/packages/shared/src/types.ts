export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'needs_review' | 'rejected';

export type AnnotationType = 'correct' | 'error' | 'warning' | 'note';

export type ConclusionStatus = 'pass' | 'fail' | 'pending' | 'needs_confirmation';

export type ResultUsability = 'direct_use' | 'needs_trainer_review' | 'rejected';

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  type: 'puzzle' | 'reference' | 'annotation' | 'grid';
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  data?: any;
}

export interface Annotation {
  id: string;
  layerId: string;
  type: AnnotationType;
  position: Point;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  screenshotRequired?: boolean;
  screenshotPath?: string;
}

export interface ScoreItem {
  id: string;
  name: string;
  category: string;
  maxScore: number;
  score: number;
  weight: number;
  comment: string;
  linkedAnnotationIds: string[];
}

export interface ScoreSheet {
  id: string;
  taskId: string;
  items: ScoreItem[];
  totalScore: number;
  maxTotalScore: number;
  updatedAt: string;
  synchronizedWithNotes: boolean;
}

export interface Conclusion {
  id: string;
  taskId: string;
  status: ConclusionStatus;
  summary: string;
  detailedFindings: string;
  recommendations: string;
  usability: ResultUsability;
  synchronizedWithScoreSheet: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewNote {
  id: string;
  taskId: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  affectsScoreSheet: boolean;
  affectsConclusion: boolean;
}

export interface HistoryAction {
  type: 'create' | 'update' | 'delete' | 'undo' | 'redo' | 'reopen';
  entityType: 'annotation' | 'layer' | 'score' | 'conclusion' | 'note' | 'task';
  entityId: string;
  snapshot: any;
  previousSnapshot?: any;
  description: string;
}

export interface HistoryRecord {
  id: string;
  taskId: string;
  action: HistoryAction;
  timestamp: string;
  userId: string;
}

export interface PuzzleMaterial {
  id: string;
  name: string;
  type: 'image' | 'svg' | 'template';
  path: string;
  thumbnail?: string;
  missing: boolean;
}

export interface ReviewLevel {
  id: string;
  name: string;
  description: string;
  order: number;
  requiresBoundaryFailure: boolean;
  requiresUndo: boolean;
  minAnnotations: number;
}

export interface ReviewTask {
  id: string;
  title: string;
  description: string;
  status: ReviewStatus;
  currentLevelId: string;
  assignee: string;
  reviewer?: string;
  layers: Layer[];
  annotations: Annotation[];
  scoreSheet: ScoreSheet;
  conclusion?: Conclusion;
  notes: ReviewNote[];
  history: HistoryRecord[];
  historyIndex: number;
  materials: PuzzleMaterial[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskListItem {
  id: string;
  title: string;
  status: ReviewStatus;
  assignee: string;
  usability?: ResultUsability;
  updatedAt: string;
  hasUnsyncedChanges: boolean;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'both';
  includeAnnotations: boolean;
  includeScoreSheet: boolean;
  includeHistory: boolean;
  includeScreenshots: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  suggestion: string;
  missingMaterials?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: ValidationError[];
}
