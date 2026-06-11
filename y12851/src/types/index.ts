export type RiskLevel = 'normal' | 'watch' | 'abnormal' | 'high_risk'

export type MetricKey = 'dissolved_oxygen' | 'ph' | 'turbidity' | 'conductivity' | 'water_temp' | 'chlorophyll_a'

export interface MetricDef {
  key: MetricKey
  label: string
  unit: string
  formula: string
  range: string
  failReason: string
  checkAbnormal: (value: number | null) => { isAbnormal: boolean; degree: number; fail: boolean }
}

export interface BuoyRecord {
  id: string
  stationId: string
  stationName: string
  timestamp: string
  dissolved_oxygen: number | null
  ph: number | null
  turbidity: number | null
  conductivity: number | null
  water_temp: number | null
  chlorophyll_a: number | null
  source: string
  verified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  verifyNote: string | null
  hasPhoto: boolean
  photoType: string | null
}

export interface MetricResult {
  key: MetricKey
  label: string
  value: number | null
  unit: string
  isAbnormal: boolean
  degree: number
  fail: boolean
}

export interface RiskAssessment {
  id: string
  stationId: string
  stationName: string
  timestamp: string
  level: RiskLevel
  metrics: MetricResult[]
  version: number
  hasPhoto: boolean
  adjustedLevel: RiskLevel
  photoMissing: boolean
}

export interface AssessmentHistory {
  id: string
  assessmentId: string
  stationId: string
  previousLevel: RiskLevel
  currentLevel: RiskLevel
  previousVersion: number
  currentVersion: number
  changedAt: string
  changeReason: string
}

export type DuplicateType = 'same_value' | 'diff_value' | 'cross_station'

export interface DuplicateGroup {
  id: string
  type: DuplicateType
  description: string
  recordIds: string[]
  resolved: boolean
  resolvedAction: string | null
  mergedResult: BuoyRecord | null
}

export interface PhotoGap {
  stationId: string
  stationName: string
  timestamp: string
  missingPhotoType: string
  recordId: string
  canCompute: boolean
}
