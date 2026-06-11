export type FloorUnit = 'meters' | 'feet' | 'millimeters'

export type ObjectStatus = 'normal' | 'warning' | 'error' | 'pending' | 'suspended'

export type CoordinateSystem = 'local' | 'global' | 'stage'

export type ViewAngle = 'front' | 'side' | 'top'

export interface Position3D {
  x: number
  y: number
  z: number
}

export interface NoteHistoryItem {
  id: string
  timestamp: string
  author: string
  content: string
  type: 'annotation' | 'correction' | 'suspension' | 'confirmation' | 'system'
}

export interface Screenshot {
  id: string
  timestamp: string
  author: string
  description: string
  viewAngle: ViewAngle
  dataUrl?: string
  version: number
  processingResult?: string
}

export interface SensorRecord {
  id: string
  timestamp: string
  source: string
  coordinateSystem: CoordinateSystem
  position: Position3D
  rawPosition: Position3D
  floorLevel: number
  floorUnit: FloorUnit
  rawFloorUnit: FloorUnit
  tension: number
  tilt: number
  temperature: number
  hasCoordinateMismatch: boolean
  originalNote: string
}

export interface Batten {
  id: string
  name: string
  label: string
  status: ObjectStatus
  currentPosition: Position3D
  floorLevel: number
  floorUnit: FloorUnit
  coordinateSystem: CoordinateSystem
  sensorRecords: SensorRecord[]
  noteHistory: NoteHistoryItem[]
  screenshots: Screenshot[]
  sceneAnnotation: string
  sideDescription: string
  screenshotDescription: string
  hasUnitMismatch: boolean
  detectedFloorUnits: FloorUnit[]
  isSuspended: boolean
  suspensionReason?: string
  confirmedByTeacher?: boolean
}

export interface HandoffLog {
  id: string
  timestamp: string
  fromOperator: string
  toOperator: string
  battenIds: string[]
  summary: string
  attachments: {
    sensorRecordIds: string[]
    screenshotIds: string[]
    noteIds: string[]
  }
}
