export type BodyPart = 'head' | 'torso' | 'arm' | 'leg';

export type Severity = 'warning' | 'danger' | 'boundary';

export type OperationType = 'annotate' | 'undo' | 'redo' | 'supplement' | 'confirm' | 'reopen' | 'rerun' | 'export';

export type TaskStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'reopened';

export type LayerMode = 'before' | 'after' | 'split';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ExportContent = 
  | 'basicInfo' 
  | 'skeletonData' 
  | 'collisionResults' 
  | 'scoreSheet' 
  | 'boundaryCases' 
  | 'operationHistory' 
  | 'repeatReasons' 
  | 'statistics';

export interface SkeletonNode {
  id: string;
  name: string;
  x: number;
  y: number;
  confidence: number;
  part: BodyPart;
  isBoundary?: boolean;
  isBadData?: boolean;
}

export interface SkeletonFrame {
  id: string;
  frameId: string;
  timestamp: number;
  status: 'normal' | 'warning' | 'error';
  layerId: string;
  nodes: SkeletonNode[];
  hasBadData?: boolean;
}

export interface CollisionPoint {
  id: string;
  nodes: [string, string];
  distance: number;
  threshold: number;
  severity: Severity;
  isFalsePositive: boolean;
  reason: string;
  description: string;
  frameIndex: number;
  confirmed?: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  comment?: string;
}

export interface BoneConnection {
  from: string;
  to: string;
  name: string;
}

export interface LayerVersion {
  layerId: string;
  versionName: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface ScoreSheet {
  sheetId: string;
  taskId: string;
  isDelayed: boolean;
  delayReason?: string;
  scores: {
    itemName: string;
    score?: number;
    fullScore: number;
    unit?: string;
    missingUnit?: boolean;
    isOldData?: boolean;
    remark?: string;
  }[];
  supplementNote?: string;
  supplementBy?: string;
  supplementAt?: string;
}

export interface OperationRecord {
  id: string;
  type: OperationType;
  operator: string;
  timestamp: string;
  description: string;
  detail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ReviewConfirm {
  confirmId: string;
  taskId: string;
  reviewer: string;
  comment: string;
  isApproved: boolean;
  confirmedAt: string;
}

export interface AnnotationTask {
  id: string;
  taskId: string;
  name: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignee: string;
  annotator: string;
  description: string;
  annotationCount: number;
  collisionCount: number;
  boundaryCount: number;
  rerunCount: number;
  supplementCount: number;
  badDataCount: number;
  pendingConfirmCount: number;
  operationHistory?: OperationRecord[];
}

export interface AnnotationState {
  tasks: AnnotationTask[];
  currentTask: AnnotationTask | null;
  frames: SkeletonFrame[];
  currentFrameIndex: number;
  collisions: CollisionPoint[];
  bones: BoneConnection[];
  history: OperationRecord[];
  historyIndex: number;
  scoreSheet: ScoreSheet | null;
  layers: LayerVersion[];
  activeLayerId: string;
  layerMode: LayerMode;
  reviews: ReviewConfirm[];
  viewState: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  selectedNodeId: string | null;
  isPlaying: boolean;
}

export interface AnnotationActions {
  loadTask: (taskId: string) => Promise<void>;
  setFrameIndex: (index: number) => void;
  updateNode: (nodeId: string, x: number, y: number) => void;
  undo: () => void;
  redo: () => void;
  togglePlay: () => void;
  supplementScore: (itemIndex: number, score: number, remark?: string) => void;
  confirmBoundary: (collisionId: string, approved: boolean, comment: string) => void;
  reRunAnnotation: () => void;
  reopenTask: () => void;
  updateTask: (taskId: string, updates: Partial<AnnotationTask>) => void;
  switchLayer: (layerId: string) => void;
  setLayerMode: (mode: LayerMode) => void;
  setViewState: (state: Partial<AnnotationState['viewState']>) => void;
  selectNode: (nodeId: string | null) => void;
  exportReport: (format: ExportFormat, contents?: ExportContent[]) => Promise<string>;
  completeReview: (approved: boolean, comment: string) => void;
  resetState: () => void;
}

export type AnnotationStore = AnnotationState & AnnotationActions;

export interface ReportData {
  task: AnnotationTask;
  summary: {
    totalFrames: number;
    totalNodes: number;
    collisions: number;
    boundaryCases: number;
    falsePositives: number;
    rerunCount: number;
    avgConfidence: number;
  };
  timeline: OperationRecord[];
  boundaryDetails: {
    collision: CollisionPoint;
    nodes: [SkeletonNode, SkeletonNode];
    frameId: string;
  }[];
  comparisonData: {
    before: number;
    after: number;
    category: string;
  }[];
}
