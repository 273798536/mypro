export interface Position3D {
  x: number
  y: number
  z: number
}

export interface Rack {
  id: string
  name: string
  position: Position3D
  size: { width: number; height: number; depth: number }
  totalSlots: number
  maxPower: number
  usedSlots: number
  currentPower: number
  inletTemp: number
  outletTemp: number
  status: 'normal' | 'warning' | 'critical' | 'offline'
  hasAlert: boolean
}

export interface ACUnit {
  id: string
  name: string
  position: Position3D
  size: { width: number; height: number; depth: number }
  coolingCapacity: number
  supplyTemp: number
  returnTemp: number
  fanSpeed: number
  running: boolean
  dataLagSeconds: number
  status: 'normal' | 'warning' | 'critical' | 'offline'
}

export interface TemperatureSample {
  id: string
  rackId: string
  position: Position3D
  timestamp: Date
  inletTemp: number
  outletTemp: number
  dataSource: string
  qualityFlag: 'good' | 'missing' | 'outlier' | 'conflict'
}

export interface Alert {
  id: string
  sourceType: 'rack' | 'ac' | 'temperature' | 'power'
  sourceId: string
  timestamp: Date
  level: 'info' | 'warning' | 'critical'
  message: string
  status: 'pending' | 'acknowledged' | 'resolved' | 'auto-resolved'
  correctionNote?: string
  needsManualConfirm: boolean
  position: Position3D
}

export interface DataCorrection {
  id: string
  sampleId: string
  correctedAt: Date
  operator: string
  originalValue: number
  correctedValue: number
  reason: string
  dataSource: string
}

export interface LoadRecord {
  id: string
  rackId: string
  timestamp: Date
  powerKw: number
  currentA: number
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface LayerVisibility {
  racks: boolean
  acUnits: boolean
  temperatureCloud: boolean
  alerts: boolean
  loadIndicators: boolean
  airflowParticles: boolean
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8

export interface SceneState {
  currentTime: Date
  isPlaying: boolean
  playbackSpeed: PlaybackSpeed
  selectedRackId: string | null
  selectedAlertId: string | null
  layers: LayerVisibility
  cameraPosition: Position3D
  cameraTarget: Position3D
}

export interface DataQualityIssue {
  type: 'gap' | 'lag' | 'occlusion' | 'conflict'
  severity: 'info' | 'warning' | 'critical'
  message: string
  location?: Position3D
  timestamp: Date
}
