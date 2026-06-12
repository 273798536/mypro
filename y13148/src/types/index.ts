export type RecordSource = 'normal' | 'draft' | 'verbal'

export type RecordStatus = 'processed' | 'pending' | 'evidence_needed'

export type JumpCause = 'threshold' | 'unit' | 'single_record' | 'unknown'

export interface DataRecord {
  id: string
  name: string
  value: number
  unit: string
  error: number
  source: RecordSource
  status: RecordStatus
  createdAt: string
  updatedAt: string
  notes: string
  isDuplicate?: boolean
  duplicateOf?: string
}

export interface FilterParams {
  unit: string
  confidenceLevel: number
  simulationCount: number
  sourceTypes: RecordSource[]
  dateRange?: [string, string]
}

export interface FilterHistory {
  id: string
  timestamp: string
  filterParams: FilterParams
  resultSnapshot: {
    mean: number
    stdDev: number
    confidenceInterval: [number, number]
    recordCount: number
  }
}

export interface MonteCarloResult {
  samples: number[]
  mean: number
  stdDev: number
  variance: number
  confidenceInterval: {
    lower: number
    upper: number
    level: number
  }
  histogram: {
    bins: number[]
    counts: number[]
  }
  relativeError: number
}

export interface DiagnosisResult {
  hasJump: boolean
  jumpCause?: JumpCause
  jumpDescription: string
  duplicateRecords: string[]
  suggestions: string[]
  affectedRecordId?: string
}

export interface UnitDefinition {
  name: string
  symbol: string
  toBase: number | ((value: number) => number)
  fromBase: number | ((value: number) => number)
}

export interface UnitCategory {
  category: 'length' | 'mass' | 'time' | 'temperature'
  baseUnit: string
  units: UnitDefinition[]
}
