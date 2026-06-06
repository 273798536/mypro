export interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface RoutePoint extends Coordinate {
  id: string;
  altitude?: number;
  speed?: number;
  direction?: number;
}

export interface Annotation {
  id: string;
  routePointId: string;
  type: 'marker' | 'segment' | 'comment';
  content: string;
  category: 'safety' | 'technique' | 'strategy' | 'general';
  color: string;
  startTime?: number;
  endTime?: number;
  createdAt: number;
  updatedAt: number;
  author: string;
  isActive: boolean;
}

export interface ScoreTable {
  id: string;
  name: string;
  items: ScoreItem[];
  totalScore: number;
  maxScore: number;
  status: 'pending' | 'completed' | 'failed';
  feedback?: string;
}

export interface ScoreItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  comment?: string;
  criteria: string;
}

export interface ExportReport {
  routeId: string;
  exportTime: number;
  summary: {
    status: 'pass' | 'pending' | 'failed';
    totalAnnotations: number;
    totalScore: number;
    maxScore: number;
    colorDistribution: Record<string, number>;
  };
  annotations: Annotation[];
  scoreTable: ScoreTable;
  canvasState: CanvasState;
  metadata: {
    author: string;
    reviewStatus: 'draft' | 'reviewed' | 'exported';
    version: number;
  };
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedAnnotationIds: string[];
  filterCategories: string[];
  filterAuthors: string[];
  timeRange: [number, number] | null;
  viewMode: 'edit' | 'review' | 'student';
  colorRules: ColorRule[];
}

export interface ColorRule {
  id: string;
  category: string;
  color: string;
  label: string;
  priority: number;
}

export interface UndoState {
  timestamp: number;
  action: string;
  previousState: Partial<CanvasState>;
  affectedAnnotationIds: string[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  errorMessages: string[];
  mergedAnnotations: Annotation[];
  resolvedConflicts: ConflictResolution[];
}

export interface ConflictResolution {
  type: 'duplicate' | 'overwrite' | 'skip';
  originalId: string;
  resolvedId: string;
  reason: string;
}

export interface ErrorContext {
  code: string;
  message: string;
  actionableMessage: string;
  missingData?: {
    type: 'score_table' | 'annotation' | 'route_data';
    description: string;
  };
  suggestedAction?: string;
}

export interface SampleData {
  routePoints: RoutePoint[];
  annotations: Annotation[];
  scoreTable: ScoreTable;
  canvasState: CanvasState;
}
