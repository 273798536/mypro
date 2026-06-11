export type RecordStatus = 'normal' | 'anomaly' | 'revoked'

export type LightType = 'top' | 'side' | 'bottom' | 'accent'

export interface LightPoint {
  id: string
  position: { x: number; y: number }
  type: LightType
  colorTemp: number
  illuminance: number
  label: string
  isAnomaly: boolean
  anomalyNote?: string
}

export interface InspectionRecord {
  id: string
  photoUrl: string
  floor: string
  unit: string
  status: RecordStatus
  revokeReason?: string
  timestamp: string
  displayCaseId: string
  lights: LightPoint[]
}

export interface FilterState {
  floor: string
  unit: string
  statuses: RecordStatus[]
}

export interface MixedInputResult {
  isMixed: boolean
  floor: string
  unit: string
  reason?: string
}

export interface TraceSnapshot {
  id: string
  filterState: FilterState
  selectedLightId: string | null
  selectedRecordId: string | null
  timestamp: string
}
