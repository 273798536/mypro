export interface Point {
  x: number
  y: number
}

export type AnomalyType =
  | 'boundary_violation'
  | 'gps_drift'
  | 'duplicate_point'
  | 'speed_anomaly'
  | 'missing_data'

export interface TrajectoryPoint {
  id: string
  x: number
  y: number
  timestamp: string
  sourceNote: string
  originalLineNumber?: number
  sourceImage?: string
  rowNumber?: number
  imageName?: string
  isAnomaly?: boolean
  anomalyType?: AnomalyType
}

export interface SourceReference {
  lineNumber: number
  imageName?: string
  note?: string
}

export interface Annotation {
  id: string
  pointId: string
  type: AnomalyType
  status: 'pending' | 'confirmed' | 'rejected' | 'needs_review'
  comment: string
  createdAt: number
  createdBy: string
  sourceReference: SourceReference
}

export interface CorrectionZone {
  id: string
  points: [number, number][]
  type: 'boundary' | 'collision' | 'normal'
  status: 'pending' | 'confirmed' | 'rejected'
  label: string
  source: string
}

export interface Layer {
  id: string
  name: string
  type: 'trajectory' | 'boundary' | 'annotation' | 'background'
  visible: boolean
  locked: boolean
  points: TrajectoryPoint[]
  color: string
  opacity: number
}

export interface Objective {
  id: string
  description: string
  completed: boolean
}

export interface ExpectedAnnotation {
  pointId: string
  type: AnomalyType
  reason: string
}

export interface BoundaryFailure {
  id: string
  pointId: string
  reason: string
  timestamp: number
}

export interface Level {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  isCompleted: boolean
  hasBoundaryFailure: boolean
  hasUndoRedo: boolean
  trajectoryPoints: TrajectoryPoint[]
  correctionZones: CorrectionZone[]
  trajectoryData: TrajectoryPoint[]
  boundaries: Point[][]
  expectedAnnotations: ExpectedAnnotation[]
  objectives: Objective[]
  hints: string[]
  baseImage: string
}

export interface HistoryEntry {
  id: string
  timestamp: number
  action: 'annotate' | 'confirm' | 'reject' | 'undo' | 'redo' | 'reset'
  annotationId: string
  previousState?: Annotation
  description: string
}

export interface ReviewSession {
  id: string
  levelId: string
  startTime: number
  status: 'in_progress' | 'completed'
  annotations: Annotation[]
  history: HistoryEntry[]
  boundaryFailures: BoundaryFailure[]
}

export interface SettlementDetail {
  annotationId: string
  pointId: string
  userAction: 'confirmed' | 'rejected' | 'missed'
  expectedAction: 'confirm' | 'reject'
  isCorrect: boolean
  sourceReference: SourceReference
}

export interface Settlement {
  sessionId: string
  totalPoints: number
  correctAnnotations: number
  incorrectAnnotations: number
  missedAnnotations: number
  accuracy: number
  timeSpent: number
  boundaryFailures: number
  undoCount: number
  redoCount: number
  status: 'passed' | 'needs_review' | 'failed'
  details: SettlementDetail[]
}

export interface ExportSummary {
  status: 'passed' | 'needs_review' | 'failed'
  levelId: string
  levelName: string
  totalPoints: number
  annotations: number
  accuracy: number
  exportTime: number
  summaryText: string
}

export interface ExportData {
  summary: ExportSummary
  annotations: Annotation[]
  trajectoryPoints: TrajectoryPoint[]
  correctionZones: CorrectionZone[]
  layers: Layer[]
  settlement: Settlement
}

export interface AppState {
  currentLevel: Level | null
  currentSession: ReviewSession | null
  levels: Level[]
  layers: Layer[]
  annotations: Annotation[]
  history: HistoryEntry[]
  historyIndex: number
  settlement: Settlement | null
  selectedPoint: TrajectoryPoint | null
  selectedLayer: Layer | null
  zoom: number
  pan: Point
  isCompleted: boolean
}
