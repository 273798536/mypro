export interface AlarmRecord {
  id: string
  sensorSerial: string
  alarmType: string
  rawValue: number
  rawUnit: string
  convertedValue: number
  baseUnit: string
  timestamp: string
  sampleSize: number
  material: string
  object: string
}

export interface MaintenanceResult {
  id: string
  relatedAlarmIds: string[]
  component: string
  action: string
  confirmed: boolean
  excluded: boolean
  timestamp: string
  labelDelayDetected: boolean
  material: string
  object: string
}

export interface LocalizationReport {
  id: string
  source: string
  componentRanking: ComponentProbability[]
  priorStrength: number
  evidenceChain: EvidenceItem[]
  importedAt: string
  unitConflicts: UnitConflict[]
  calibrationConflicts: CalibrationConflict[]
}

export interface ComponentProbability {
  component: string
  probability: number
  previousRank: number
  currentRank: number
  rankChanged: boolean
  material: string
  object: string
}

export interface EvidenceItem {
  sourceId: string
  sourceType: 'alarm' | 'maintenance' | 'report'
  description: string
  contributionToRank: string
  confidence: number
}

export interface ReinspectionSuggestion {
  id: string
  component: string
  material: string
  object: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  relatedEvidenceIds: string[]
}

export interface TraceLink {
  forwardPath: TraceNode[]
  backwardPath: TraceNode[]
}

export interface TraceNode {
  id: string
  type: 'alarm' | 'maintenance' | 'report' | 'result'
  label: string
  sensorSerial?: string
  timestamp?: string
  children: TraceNode[]
}

export interface UnitConflict {
  id: string
  field: string
  existingValue: string
  incomingValue: string
  existingUnit: string
  incomingUnit: string
  resolved: boolean
  sourceType: string
  sourceId: string
}

export interface CalibrationConflict {
  id: string
  field: string
  existingCalibration: string
  incomingCalibration: string
  autoModified: boolean
  sourceType: string
  sourceId: string
}

export interface BoundaryWarning {
  id: string
  type: 'sample_too_small' | 'prior_too_strong' | 'label_lag'
  component: string
  material: string
  object: string
  detail: string
  severity: 'warning' | 'error'
}

export type UnitCategory = 'temperature' | 'pressure' | 'vibration' | 'flow' | 'voltage' | 'current'

export interface UnitDef {
  category: UnitCategory
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

export interface ComponentPrior {
  component: string
  prior: number
  material: string
  object: string
}
