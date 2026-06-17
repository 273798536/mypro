export interface ParamVersion {
  id: string
  name: string
  createdAt: string
  operator: string
}

export interface Step {
  id: string
  stepIndex: number
  title: string
  description: string
  photo: string
  isRetracted: boolean
  retractReason?: string
}

export interface ParamValue {
  id: string
  stepId: string
  versionId: string
  paramName: string
  value: number
  unit: string
  direction?: 'forward' | 'reverse'
  hasUnitError: boolean
  hasDirectionError: boolean
  errorNote?: string
}

export interface Anomaly {
  id: string
  stepId: string
  type: 'unit' | 'direction' | 'other'
  description: string
  actionHint: string
  status: 'pending' | 'processing' | 'resolved'
}

export interface Evidence {
  id: string
  anomalyId: string
  name: string
  provided: boolean
}
