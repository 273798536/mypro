export interface Equipment {
  id: string
  name: string
  model: string
  manufacturer: string
}

export interface MotorComponent {
  id: string
  equipmentId: string
  name: string
  type: 'stator' | 'rotor' | 'bearing' | 'shaft' | 'housing' | 'winding' | 'sensor'
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}

export interface NameplateRecord {
  id: string
  equipmentId: string
  fieldName: string
  originalValue: string
  currentValue: string
  unit: string
  changed: boolean
}

export interface NameplateChange {
  id: string
  recordId: string
  oldValue: string
  newValue: string
  changedAt: string
  changedBy: string
  source: '铭牌' | '正常记录' | '口头说明'
}

export interface TorqueRecord {
  id: string
  equipmentId: string
  componentId: string
  measuredTorque: number
  ratedTorque: number
  errorPercent: number
  timestamp: string
  severity: 'normal' | 'warning' | 'critical'
}

export interface AnomalyEvent {
  id: string
  componentId: string
  type: string
  severity: 'low' | 'medium' | 'high'
  timestamp: string
  description: string
}

export interface ThresholdBreach {
  id: string
  recordId: string
  parameterName: string
  oldValue: number
  newValue: number
  changedAt: string
}

export interface ParameterSet {
  id: string
  safetyThreshold: number
  calculationCoeff: number
  formula: string
  unit: string
}

export interface RecalcResult {
  id: string
  parameterSetId: string
  componentId: string
  componentName: string
  oldValue: number
  newValue: number
  delta: number
  boundarySample: string
  explanation: string
}

export interface ConsistencyCheck {
  passed: boolean
  pageStatus: string
  csvStatus: string
  mismatches: string[]
}

export type FilterOptions = {
  equipmentId: string | null
  severity: ('normal' | 'warning' | 'critical')[]
  componentType: string | null
  source: string | null
}

export type TimeWindow = {
  start: string
  end: string
}
