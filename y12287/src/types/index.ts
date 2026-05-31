export type JawType = 'upper' | 'lower'

export type AlertType = 'misalignment' | 'overlap' | 'excessive' | 'dataGap' | 'conflict'

export type Severity = 'info' | 'warning' | 'critical'

export interface DentalModel {
  id: string
  name: string
  jawType: JawType
  source: string
  isComplete: boolean
}

export interface ContactPoint {
  id: string
  toothNumber: string
  positionX: number
  positionY: number
  positionZ: number
  intensity: number
  isOverlapping: boolean
  isMisaligned: boolean
  jawType: JawType
}

export interface GrindingSuggestion {
  id: string
  toothNumber: string
  depth: number
  area: string
  recommendedMax: number
  isExcessive: boolean
  source: string
}

export interface DiagnosticAlert {
  id: string
  alertType: AlertType
  severity: Severity
  toothNumber: string
  materialName: string
  description: string
  sourceA?: string
  sourceB?: string
  valueA?: string
  valueB?: string
}

export interface CorrectionRecord {
  id: string
  contactPointId: string
  originalX: number
  originalY: number
  originalZ: number
  correctedX: number
  correctedY: number
  correctedZ: number
  timestamp: string
}

export type InputType = 'model' | 'grinding' | 'report'

export interface InputFile {
  id: string
  type: InputType
  name: string
  loaded: boolean
  hasConflict: boolean
}

export type ViewMode = 'free' | 'upperTop' | 'lowerBottom' | 'side'
