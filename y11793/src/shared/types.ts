export type FittingSessionStatus = 'normal' | 'warning' | 'critical'

export type DataSourceType = 'voltage' | 'current' | 'temperature' | 'sampling_interval' | 'initial_params' | 'report'

export type AlertCategory = 'sampling_gap' | 'temperature_drift' | 'parameter_divergence'

export type AlertSeverity = 'warning' | 'severe' | 'fatal'

export interface FittingSession {
  id: string
  createdAt: number
  updatedAt: number
  status: FittingSessionStatus
  rSquared: number
  rmse: number
  sampleCount: number
  temperatureMin: number
  temperatureMax: number
  samplingIntervalMs: number
}

export interface DataSource {
  id: string
  sessionId: string
  type: DataSourceType
  sourceLabel: string
  fileName?: string
  timestamp: number
  rawData: number[]
  correctionLog: string[]
}

export interface FittingParameter {
  id: string
  sessionId: string
  name: string
  value: number
  lowerBound: number
  upperBound: number
  stdError: number
  isWithinBound: boolean
  iteration: number
}

export interface AlertDetails {
  gapStart?: number
  gapEnd?: number
  driftRate?: number
  parameterName?: string
}

export interface Alert {
  id: string
  sessionId: string
  category: AlertCategory
  severity: AlertSeverity
  message: string
  timestamp: number
  resolved: boolean
  details?: AlertDetails
}

export interface CorrectionTrace {
  id: string
  sessionId: string
  field: string
  beforeValue: number
  afterValue: number
  reason: string
  timestamp: number
}

export interface RCModel {
  ocv: number
  R0: number
  R1: number
  C1: number
  tau1?: number
}

export interface FittingResult {
  parameters: RCModel
  residuals: number[]
  rSquared: number
  rmse: number
  iterations: number
  converged: boolean
  alerts: Alert[]
}
