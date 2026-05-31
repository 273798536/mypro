export type AnomalyType = 'normal' | 'drift' | 'threshold_version_error' | 'missing_sample'

export type SeverityLevel = 'normal' | 'warning' | 'critical'

export interface Cabinet {
  id: string
  name: string
  location: string
}

export interface Cluster {
  id: string
  cabinetId: string
  index: number
}

export interface Cell {
  id: string
  clusterId: string
  cabinetId: string
  index: number
  status: AnomalyType
}

export interface CellReading {
  cellId: string
  timestamp: number
  temperature: number
  voltage: number
  anomalyType: AnomalyType
}

export interface MaintenanceRecord {
  id: string
  cellId: string
  date: number
  type: string
  result: string
  description: string
}

export interface ThresholdVersion {
  id: string
  name: string
  releaseDate: number
}

export interface ThresholdConfig {
  versionId: string
  tempWarning: number
  tempCritical: number
  voltWarning: number
  voltCritical: number
  driftTolerance: number
}

export interface ThresholdCheckResult {
  severity: SeverityLevel
  anomalyType: AnomalyType
  message: string
  detail: string
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  normal: '正常',
  drift: '传感器漂移',
  threshold_version_error: '阈值版本错',
  missing_sample: '缺采样',
}

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  normal: '正常',
  warning: '预警',
  critical: '严重',
}
