export type PipelineType = "gas" | "electric" | "stormwater" | "watersupply" | "telecom"
export type VersionStatus = "current" | "superseded" | "draft"
export type RiskLevel = "high" | "medium" | "low"
export type DataSource = "original" | "processed"
export type ConflictType = "elevation_mismatch" | "outdated_drawing" | "pipeline_crossing"
export type ConflictSeverity = "critical" | "warning" | "info"
export type ConflictStatus = "unresolved" | "in_progress" | "resolved"

export interface PipelineSegment {
  id: string
  startPoint: [number, number, number]
  endPoint: [number, number, number]
  elevation: number
  depth: number
}

export interface Pipeline {
  id: string
  name: string
  type: PipelineType
  version: string
  versionStatus: VersionStatus
  material: string
  diameter: number
  segments: PipelineSegment[]
  riskLevel: RiskLevel
  dataSource: DataSource
  sourceDescription: string
  lastUpdated: string
  color: string
}

export interface Conflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  description: string
  involvedPipelines: string[]
  location: [number, number, number]
  elevationExpected?: number
  elevationActual?: number
  status: ConflictStatus
  coordinationRecords: string[]
}

export interface CoordinationRecord {
  id: string
  conflictId: string
  action: string
  handler: string
  timestamp: string
  snapshotData?: string
  result: string
  pipelineChanges?: PipelineChange[]
}

export interface PipelineChange {
  pipelineId: string
  field: string
  oldValue: string
  newValue: string
}

export interface ClippingPlaneState {
  enabled: boolean
  position: number
  direction: "x" | "y" | "z"
}

export interface FilterState {
  pipelineTypes: PipelineType[]
  riskLevels: RiskLevel[]
  showConflictsOnly: boolean
  searchQuery: string
}

export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  gas: "燃气",
  electric: "电力",
  stormwater: "雨水",
  watersupply: "给水",
  telecom: "通信",
}

export const PIPELINE_COLORS: Record<PipelineType, string> = {
  gas: "#ff6b35",
  electric: "#ffd23f",
  stormwater: "#4ecdc4",
  watersupply: "#45b7d1",
  telecom: "#a855f7",
}

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  elevation_mismatch: "标高错配",
  outdated_drawing: "旧图未作废",
  pipeline_crossing: "管线交叉",
}

export const CONFLICT_SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  critical: "#ef4444",
  warning: "#f97316",
  info: "#eab308",
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
}
