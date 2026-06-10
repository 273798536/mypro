export type RecordStatus = 'pass' | 'pending' | 'fail'
export type SafetyLevel = 'info' | 'warning' | 'danger'

export interface ExperimentRecord {
  id: string
  name: string
  type: 'spectral' | 'concentration' | 'balance' | 'temperature'
  status: RecordStatus
  createdAt: string
  updatedAt: string
}

export interface PeakData {
  position: number
  intensity: number
  halfWidth: number
}

export interface OverlapRegion {
  start: number
  end: number
  peakIndices: [number, number]
  overlapRatio: number
}

export interface SpectralData {
  id: string
  recordId: string
  substanceName: string
  wavelengthRange: [number, number]
  dataPoints: { wavelength: number; intensity: number }[]
  peaks: PeakData[]
  overlapRegions: OverlapRegion[]
  hasOverlap: boolean
}

export interface SafetyNote {
  id: string
  recordId: string
  content: string
  level: SafetyLevel
  author: string
  createdAt: string
}

export interface TemperaturePoint {
  time: number
  temperature: number
}

export interface AnomalyRange {
  start: number
  end: number
  type: 'overheat' | 'underheat'
}

export interface TemperatureCurve {
  id: string
  recordId: string
  timePoints: number[]
  temperaturePoints: number[]
  anomalyRanges: AnomalyRange[]
}

export interface ConcentrationRecord {
  id: string
  recordId: string
  substance: string
  molarMass: number
  value: number
  unit: 'mol/L' | 'g/L' | '%'
  convertedValue: number
  convertedUnit: 'mol/L' | 'g/L' | '%'
  safetyNote?: string
}

export interface BalanceStep {
  description: string
  atomCounts: Record<string, { left: number; right: number }>
  isBalanced: boolean
}

export interface BalanceResult {
  id: string
  recordId: string
  equation: string
  balancedEquation: string
  coefficients: Record<string, number>
  steps: BalanceStep[]
}

export interface TraceLog {
  id: string
  recordId: string
  action: string
  operator: string
  detail: string
  timestamp: string
}
