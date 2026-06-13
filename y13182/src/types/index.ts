export interface ParameterSnapshot {
  id: string
  timestamp: number
  dropletDiameter: number
  dropletDiameterUnit: string
  flowRate: number
  flowRateUnit: string
  temperature: number
  temperatureUnit: string
  humidity: number
  humidityUnit: string
}

export interface Note {
  id: string
  snapshotId: string
  content: string
  isRetrospective: boolean
  originalTimestamp: number
  addedTimestamp: number
  affectedParameters: string[]
  conclusionChange: string
  versionScreenshotUrl?: string
}

export interface SafetyThreshold {
  id: string
  parameterName: string
  oldValue: number
  newValue: number
  unit: string
  changedAt: number
  changedBy: string
  reason: string
}

export interface CalculationStep {
  step: number
  description: string
  formula: string
  input: string
  output: string
  unitConversion?: string
}

export interface AnomalyRecord {
  id: string
  timestamp: number
  type: 'threshold_change' | 'parameter_exceeded' | 'note_correction'
  description: string
  relatedSnapshotId: string
  relatedNoteId?: string
  relatedThresholdId?: string
  processingResult: '阈值变更' | '参数超限' | '备注修正'
  calculationSteps: CalculationStep[]
}

export interface ConsistencyCheck {
  isConsistent: boolean
  noteCount: number
  anomalyCount: number
  snapshotCount: number
  mismatches: string[]
}

export type TimelineNodeType = 'snapshot' | 'note' | 'threshold_change' | 'retrospective_note'

export interface TimelineNode {
  timestamp: number
  type: TimelineNodeType
  label: string
  id: string
}
