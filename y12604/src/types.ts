export type GamePhase = 'idle' | 'running' | 'paused' | 'settled'

export interface CalibrationPoint {
  id: string
  x: number
  y: number
  label: string
  coordinateReversed: boolean
  manualNote: string | null
}

export interface ScaleReference {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  realDistance: number
  unit: string
}

export type AnomalyType = 'coordinate_flip' | 'scale_mismatch' | 'missing_equipment'
export type AnomalySeverity = 'need_material' | 'need_caliber_change'

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  pointId: string
  description: string
  plainExplanation: string
  manualNote: string | null
  timestamp: number
}

export interface EquipmentItem {
  id: string
  name: string
  spec: string
  addedAt: number
}

export interface CanvasSnapshot {
  points: CalibrationPoint[]
  scaleRefs: ScaleReference[]
  anomalies: Anomaly[]
  equipment: EquipmentItem[]
  timestamp: number
  action: string
}

export interface GameState {
  phase: GamePhase
  round: number
  elapsedTime: number
  points: CalibrationPoint[]
  scaleRefs: ScaleReference[]
  anomalies: Anomaly[]
  equipment: EquipmentItem[]
  snapshots: CanvasSnapshot[]
  undoStack: CanvasSnapshot[]
  redoStack: CanvasSnapshot[]
}
