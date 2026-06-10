export type ConclusionGrade = 'usable' | 'review' | 'bad'

export interface ReactionCondition {
  id: string
  recordId: string
  targetTemp: number
  tempUpperLimit: number
  tempLowerLimit: number
  targetPH: number
  phUpperLimit: number
  phLowerLimit: number
  targetDuration: number
}

export interface SpectralPeak {
  id: string
  recordId: string
  position: number
  intensity: number
  halfWidth: number
  element: string
  isOverlapping: boolean
  overlapWith: string | null
}

export interface BalanceCalculation {
  id: string
  recordId: string
  extractVolume: number | null
  sampleMass: number | null
  dilutionFactor: number | null
  nominalConcentration: number | null
  calculatedConcentration: number | null
  balanceDeviation: number | null
  isDeviationAcceptable: boolean | null
}

export interface AnomalyEntry {
  id: string
  recordId: string
  anomalyType: 'empty_field' | 'duplicate' | 'mixed_notes' | 'peak_overlap' | 'balance_deviation' | 'temp_exceed' | 'ph_exceed' | 'curve_break'
  description: string
  sourceField: string
  severity: 'low' | 'medium' | 'high'
}

export interface TemperatureCurvePoint {
  id: string
  recordId: string
  timePoint: number
  temperature: number
  isExceeding: boolean
}

export interface PHCurvePoint {
  id: string
  recordId: string
  timePoint: number
  ph: number
  isExceeding: boolean
}

export interface ExperimentRecord {
  id: string
  sampleCode: string
  extractionMethod: string | null
  temperature: number | null
  ph: number | null
  duration: number | null
  operator: string | null
  notes: string | null
  status: ConclusionGrade
  createdAt: string
  updatedAt: string
  reactionCondition: ReactionCondition
  spectralPeaks: SpectralPeak[]
  balanceCalculation: BalanceCalculation
  anomalies: AnomalyEntry[]
  temperatureCurve: TemperatureCurvePoint[]
  phCurve: PHCurvePoint[]
  completenessScore: number
}

export interface ExportDiff {
  field: string
  recordedValue: string
  calculatedValue: string
  isMatch: boolean
}
