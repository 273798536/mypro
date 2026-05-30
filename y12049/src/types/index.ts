export interface Point {
  x: number
  y: number
}

export interface FoldLine {
  id: string
  start: Point
  end: Point
  angle: number
}

export type OperationType = 'fold' | 'select' | 'undo' | 'redo' | 'load_sample'
export type SourceType = 'user' | 'system' | 'sample'
export type DetectionType = 'angle_error' | 'area_miss' | 'overlap'
export type Severity = 'warning' | 'error'
export type SampleType = 'normal' | 'area_miss' | 'angle_error' | 'overlap'

export interface OperationStep {
  id: string
  timestamp: number
  type: OperationType
  foldLine?: FoldLine
  foldDirection?: 'left' | 'right' | 'up' | 'down'
  foldAngle?: number
  source: SourceType
  sourceDetail?: string
}

export interface DetectionResult {
  type: DetectionType
  severity: Severity
  message: string
  value: number
  threshold: number
  source: string
  affectedScore: number
}

export interface PaperState {
  points: Point[]
  foldedAreas: number
  totalArea: number
  foldLines: FoldLine[]
  transform: string
  selectedPointIndex: number | null
  isFolding: boolean
}

export interface GameState {
  paper: PaperState
  steps: OperationStep[]
  currentStepIndex: number
  detections: DetectionResult[]
  score: number
  isComplete: boolean
  currentSample: Sample | null
}

export interface Sample {
  id: string
  name: string
  type: SampleType
  steps: OperationStep[]
  expectedDetections: DetectionResult[]
  description: string
}
