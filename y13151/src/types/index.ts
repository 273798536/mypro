export type BatchStatus = 'pending' | 'confirmed' | 'rejected'

export type ComputeStatus = 'success' | 'failed' | 'manual'

export type ResultLevel = 'normal' | 'warning' | 'critical'

export type FailCategory = 'formula' | 'unit' | 'threshold'

export type AnomalyStatus = 'open' | 'confirmed' | 'ignored' | 'resolved'

export type JumpCause = 'thresholdChanged' | 'unitChanged' | 'manualOverride' | 'rawJump'

export type ManualReason = 'formula' | 'unit' | 'threshold'

export type AnomalyType = 'direction' | 'failed' | 'manual' | 'jump'

export interface LogBatch {
  id: string
  source: string
  createdAt: string
  rawText: string
  status: BatchStatus
}

export interface SensorRow {
  id: string
  batchId: string
  rawLine: string
  timestamp: number
  direction: string
  reverb: number
  unit: string
  dirtyFlag: boolean
  dirtyReasons: string[]
  directionSuspicious: boolean
  directionImpact: string
  directionConfirmed?: boolean
  directionIgnored?: boolean
}

export interface TimeRangeThreshold {
  startHour: number
  endHour: number
  value: number
}

export interface ComputeConfig {
  threshold: number
  thresholdType: 'absolute' | 'timeRange'
  timeRangeThresholds: TimeRangeThreshold[]
  warningRatio: number
  unit: string
  formulaVersion: string
}

export interface ComputeRecord {
  id: string
  rowId: string
  formulaVersion: string
  threshold: number
  thresholdType: 'absolute' | 'timeRange'
  unit: string
  rawValue: number
  computedValue: number
  status: ComputeStatus
  failCategory?: FailCategory
  failNote?: string
  manualReason?: ManualReason
  manualNote?: string
  manualBy?: string
  manualAt?: string
  originalResult?: ResultLevel
  result: ResultLevel
  jumpCause?: JumpCause
  jumpNote?: string
  computeSteps: ComputeStep[]
}

export interface ComputeStep {
  label: string
  value: string
  detail?: string
}

export interface AnomalyQueue {
  id: string
  rowId: string
  computeId?: string
  type: AnomalyType
  status: AnomalyStatus
  reason: string
  impact: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface AppState {
  batches: LogBatch[]
  rows: SensorRow[]
  computes: ComputeRecord[]
  anomalies: AnomalyQueue[]
  config: ComputeConfig
  selectedBatchId: string | null
  selectedRowId: string | null
  uiNotes: Record<string, string>
}
