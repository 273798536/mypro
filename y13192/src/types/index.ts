export type SourceType = 'written' | 'oral' | 'temporary'
export type AnomalyStatus = 'processed' | 'pending_material' | 'manual_override'
export type UnitLabel = 'mΩ' | 'Ω' | 'mΩ·cm²' | 'mΩ/Ω'

export interface Cell {
  id: string
  row: number
  col: number
  moduleName: string
}

export interface ResistanceReading {
  cellId: string
  valueMohm: number
  valueMohmAlt: number
  unitLabel: UnitLabel
  timestamp: number
  isAnomaly: boolean
}

export interface MaintenanceNote {
  id: string
  cellId: string
  content: string
  sourceType: SourceType
  sourceName: string
  createdAt: number
  conflictsWithMaterial: boolean
}

export interface MaterialChange {
  id: string
  materialName: string
  fieldChanged: string
  oldValue: string
  newValue: string
  changedBy: string
  changedAt: number
  reason: string
}

export interface AnomalyRecord {
  id: string
  cellId: string
  anomalyType: string
  status: AnomalyStatus
  handler: string
  handledAt: number | null
  note: string
}

export interface ThresholdConfig {
  id: string
  parameter: string
  value: number
  unit: UnitLabel
  formulaRef: string
  updatedAt: number
  wasTampered: boolean
}

export interface MaterialField {
  field: string
  materialA: string
  materialB: string
  inconsistent: boolean
}

export interface RecalcResult {
  cellId: string
  beforeValue: number
  afterValue: number
  beforeAnomaly: boolean
  afterAnomaly: boolean
  changeReason: 'formula' | 'unit' | 'boundary' | ''
  crossedBoundary: boolean
}
