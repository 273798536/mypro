export type BlockPointType = 'formula' | 'unit' | 'threshold'

export type RecordStatus = 'processed' | 'pending_material' | 'manual_override'

export type MaterialType = 'nameplate' | 'supplementary_note' | 'verbal_note'

export type AnomalyLevel = 'low' | 'medium' | 'high'

export interface AttributionRecord {
  id: string
  cycleName: string
  status: RecordStatus
  isExtreme: boolean
  hasSamplingGap: boolean
  blockPoint?: BlockPointType
  blockNote?: string
  anomalyLevel: AnomalyLevel
  measuredValue: number
  expectedValue: number
  deviation: number
  parameterVersion: string
  conclusion: string
  createdAt: string
  updatedAt: string
}

export interface ParameterVersion {
  id: string
  recordId: string
  version: string
  parameters: Record<string, number | string>
  changedFields: string[]
  changedAt: string
}

export interface MaterialChange {
  id: string
  recordId: string
  materialType: MaterialType
  content: string
  isCaliberChanged: boolean
  caliberChangeNote?: string
  changedAt: string
}

export interface ManualOverride {
  id: string
  recordId: string
  originalConclusion: string
  overrideConclusion: string
  reason: string
  operator: string
  createdAt: string
}

export interface AnomalyPoint {
  id: string
  recordId: string
  parameterName: string
  measuredValue: number
  expectedValue: number
  explanation: string
  timestamp: string
}
