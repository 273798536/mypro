export type WeightUnit = 'N' | 'kg' | 'g'
export type LengthUnit = 'm' | 'cm'

export interface PulleyRecord {
  id: string
  name: string
  pulleyCount: number
  movingPulleys: number
  fixedPulleys: number
  objectWeight: number
  weightUnit: WeightUnit
  frictionCoefficient: number
  ropeLength: number
  ropeLengthUnit: LengthUnit
  source: string
  createdAt: string
  updatedAt: string
}

export interface CalculationResult {
  id: string
  recordId: string
  ropeSegments: number
  pullingForce: number | null
  mechanicalEfficiency: number | null
  usefulWork: number | null
  totalWork: number | null
  isValid: boolean
  calculatedAt: string
}

export type WarningLevel = 'error' | 'warning' | 'info'

export interface ValidationWarning {
  id: string
  recordId: string
  warningType: string
  level: WarningLevel
  message: string
  physicsExplanation: string
  detectedAt: string
}

export interface CorrectionEntry {
  id: string
  recordId: string
  fieldChanged: string
  oldValue: string
  newValue: string
  reason: string
  correctedAt: string
}

export interface PulleyState {
  records: PulleyRecord[]
  activeRecordId: string | null
  calculationResults: CalculationResult[]
  warnings: ValidationWarning[]
  corrections: CorrectionEntry[]
}
