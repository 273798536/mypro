export interface SpeedRecord {
  id: string
  sourceFile: string
  ballId: number
  timestamp: number
  velocityX: number
  velocityY: number
  remarks?: string
}

export interface MassTable {
  id: string
  sourceFile: string
  ballId: number
  mass: number
  remarks?: string
}

export type AnomalyType = 'MASS_MISSING' | 'DIRECTION_REVERSED' | 'ENERGY_LOSS_EXCESSIVE'

export interface Anomaly {
  id: string
  collisionId: string
  type: AnomalyType
  description: string
  severity: 'low' | 'medium' | 'high'
  affectedBalls: number[]
}

export interface BallState {
  ballId: number
  velocityX: number
  velocityY: number
  mass: number | null
  momentumX: number
  momentumY: number
  kineticEnergy: number
}

export interface CalculationStep {
  step: number
  description: string
  formula: string
  result: string
  sourceData: string
}

export interface CalculationResult {
  id: string
  collisionId: string
  ballsBefore: BallState[]
  ballsAfter: BallState[]
  totalMomentumXBefore: number
  totalMomentumYBefore: number
  totalMomentumBefore: number
  totalMomentumXAfter: number
  totalMomentumYAfter: number
  totalMomentumAfter: number
  momentumDifference: number
  momentumDifferencePercent: number
  totalKineticEnergyBefore: number
  totalKineticEnergyAfter: number
  energyLoss: number
  energyLossPercent: number
  calculationSteps: CalculationStep[]
  isValid: boolean
}

export interface Collision {
  id: string
  collisionTime: number
  collisionTimeFormatted: string
  ballIds: number[]
  speedRecordSource: string
  massTableSource: string
  videoNotes?: string
  calculationResult: CalculationResult
  anomalies: Anomaly[]
  status: 'normal' | 'warning' | 'error'
}

export interface SourceReference {
  type: 'speed' | 'mass' | 'video'
  fileName: string
  recordIds: string[]
  description: string
}

export interface ReportConfig {
  includeRawData: boolean
  includeCalculationSteps: boolean
  includeAnomalies: boolean
  includeCharts: boolean
  format: 'pdf' | 'excel'
}

export interface ImportedFile {
  id: string
  name: string
  type: 'speed' | 'mass' | 'video'
  size: number
  uploadedAt: Date
  recordCount?: number
}
