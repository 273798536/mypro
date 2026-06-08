export type GameStatus = 'idle' | 'running' | 'paused' | 'finished'

export type SampleType = 'success' | 'warning' | 'error'

export type ViolationType = 'none' | 'warning' | 'critical'

export interface Point {
  x: number
  y: number
}

export interface PathNode {
  x: number
  y: number
  velocity: number
  temperature: number
}

export interface Obstacle {
  x: number
  y: number
  width: number
  height: number
  type: 'server' | 'cooler' | 'wall'
  label: string
}

export interface Violation {
  id: string
  crossSectionId: string
  type: string
  reason: string
  severity: number
  suggestedFix: string
  position: Point
  distance: number
}

export interface CrossSection {
  id: string
  positionX: number
  positionY: number
  angle: number
  width: number
  isViolated: boolean
  violationType: ViolationType
  violations: Violation[]
  name: string
}

export interface AirflowPath {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  velocity: number
  temperature: number
  pathNodes: PathNode[]
  color: string
}

export interface Screenshot {
  id: string
  imageData: string
  timestamp: Date
  description: string
  hasViolation: boolean
  detectedViolations: string[]
}

export interface LayoutData {
  gridWidth: number
  gridHeight: number
  obstacles: Obstacle[]
  safeBoundaries: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

export interface AirflowData {
  paths: AirflowPath[]
  avgVelocity: number
  avgTemperature: number
}

export interface SampleData {
  id: string
  name: string
  type: SampleType
  description: string
  layoutData: LayoutData
  airflowData: AirflowData
  crossSections: CrossSection[]
  expectedViolationCount: number
}

export interface GameState {
  id: string
  status: GameStatus
  startTime: Date | null
  endTime: Date | null
  currentSampleId: string
  screenshots: Screenshot[]
  elapsedTime: number
  currentFrame: number
}

export interface AnalysisResult {
  sampleId: string
  sampleName: string
  totalCrossSections: number
  violatedCount: number
  warningCount: number
  criticalCount: number
  violations: Violation[]
  crossSectionDetails: {
    id: string
    name: string
    isViolated: boolean
    violationType: ViolationType
    violations: Violation[]
  }[]
  screenshots: Screenshot[]
  generatedAt: Date
}
