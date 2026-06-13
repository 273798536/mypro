export interface BuoyParameter {
  id: string
  buoyId: string
  timestamp: string
  waveHeight: number
  wavePeriod: number
  waterTemp: number
  windSpeed: number
  pressure: number
}

export type AlarmSeverity = 'critical' | 'warning' | 'info'
export type AlarmStatus = 'active' | 'resolved' | 'suppressed'

export interface AlarmRecord {
  id: string
  buoyId: string
  timestamp: string
  alarmType: string
  severity: AlarmSeverity
  parameterName: string
  originalStatus: AlarmStatus
  currentStatus: AlarmStatus
  triggerValue: number
  threshold: number
}

export interface ManualOverride {
  id: string
  buoyId: string
  timestamp: string
  parameterName: string
  oldValue: number
  newValue: number
  reason: string
  operator: string
  sourceNoteLine: string
  sourceNoteObject: string
}

export interface RepairNote {
  id: string
  buoyId: string
  timestamp: string
  content: string
  lineNumber: string
  relatedObject: string
}

export interface CausalLink {
  id: string
  overrideId: string
  affectedAlarmId: string
  conclusionBefore: string
  conclusionAfter: string
  impactDescription: string
}

export interface NoiseFlag {
  id: string
  parameterId: string
  timestamp: string
  parameterName: string
  value: number
  threshold: string
  suggestedAction: string
  isNoise: boolean
}

export type ParameterKey = 'waveHeight' | 'wavePeriod' | 'waterTemp' | 'windSpeed' | 'pressure'

export const parameterLabels: Record<ParameterKey, string> = {
  waveHeight: '波高',
  wavePeriod: '波周期',
  waterTemp: '水温',
  windSpeed: '风速',
  pressure: '气压',
}

export const parameterUnits: Record<ParameterKey, string> = {
  waveHeight: 'm',
  wavePeriod: 's',
  waterTemp: '°C',
  windSpeed: 'm/s',
  pressure: 'hPa',
}
