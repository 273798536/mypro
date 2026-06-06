export type Unit = 'meter' | 'foot' | 'unknown'

export interface Point {
  x: number
  y: number
}

export type AnomalyType =
  | 'boundary_collision'
  | 'negative_thickness'
  | 'missing_unit'
  | 'duplicate_annotation'
  | 'unit_mismatch'
  | 'data_inconsistency'

export interface Annotation {
  id: string
  content: string
  position: Point
  createdAt: Date
}

export interface Layer {
  id: string
  name: string
  color: string
  depth: {
    top: number
    bottom: number
  }
  thickness: number
  unit: Unit
  annotations: Annotation[]
  remarks: string
  source?: string
}

export type BoundaryType = 'layer' | 'fault' | 'contact'
export type BoundaryStatus = 'normal' | 'collision' | 'undefined'

export interface CollisionInfo {
  collidedBoundaryId: string
  collisionPoint: Point
  distance: number
  severity: 'high' | 'medium' | 'low'
}

export interface Boundary {
  id: string
  type: BoundaryType
  startPoint: Point
  endPoint: Point
  status: BoundaryStatus
  collisionDetails?: CollisionInfo
  relatedLayerId?: string
  color?: string
}

export type OperationType =
  | 'add_layer'
  | 'update_layer'
  | 'delete_layer'
  | 'add_boundary'
  | 'update_boundary'
  | 'delete_boundary'
  | 'add_annotation'
  | 'update_annotation'
  | 'delete_annotation'
  | 'resolve_anomaly'
  | 'ignore_anomaly'
  | 'import_data'
  | 'reset_profile'

export interface OperationRecord {
  id: string
  type: OperationType
  timestamp: Date
  data: any
  reversible: boolean
  relatedAnomalyId?: string
  description: string
  operator?: string
}

export type AnomalySeverity = 'low' | 'medium' | 'high'
export type AnomalyStatus = 'pending' | 'resolved' | 'ignored'

export interface ProcessingStep {
  step: number
  action: string
  operator: string
  timestamp: Date
  notes?: string
}

export interface TraceChain {
  anomalyId: string
  discoveryPath: OperationRecord[]
  processingHistory: ProcessingStep[]
  finalResolution: {
    status: 'resolved' | 'ignored'
    conclusion: string
  } | null
}

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  location: {
    layerId?: string
    boundaryId?: string
    coordinates: Point
  }
  description: string
  explanation: string
  suggestion: string
  relatedOperations: OperationRecord[]
  status: AnomalyStatus
  createdAt: Date
  resolvedAt?: Date
  traceChain?: TraceChain
}

export interface ProfileMetadata {
  operator?: string
  source?: string
  projectName?: string
  surveyDate?: Date
  remarks?: string
}

export interface StratumProfile {
  id: string
  name: string
  layers: Layer[]
  boundaries: Boundary[]
  anomalies: Anomaly[]
  metadata: ProfileMetadata
  createdAt: Date
  updatedAt: Date
}

export interface Command {
  id: string
  execute(): void
  undo(): void
  getDescription(): string
  getTimestamp(): Date
  getOperationRecord(): OperationRecord
}

export interface UserSettings {
  theme: 'light' | 'dark'
  unit: Unit
  operatorName: string
}

export interface AppState {
  currentProfile: StratumProfile | null
  operationHistory: OperationRecord[]
  undoStack: Command[]
  redoStack: Command[]
  settings: UserSettings
  selectedLayerId: string | null
  selectedBoundaryId: string | null
  selectedAnomalyId: string | null
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  boundary_collision: '边界碰撞',
  negative_thickness: '厚度为负',
  missing_unit: '单位缺失',
  duplicate_annotation: '重复标注',
  unit_mismatch: '单位混用',
  data_inconsistency: '数据不一致'
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  add_layer: '新增岩层',
  update_layer: '更新岩层',
  delete_layer: '删除岩层',
  add_boundary: '新增边界',
  update_boundary: '更新边界',
  delete_boundary: '删除边界',
  add_annotation: '新增标注',
  update_annotation: '更新标注',
  delete_annotation: '删除标注',
  resolve_anomaly: '处理异常',
  ignore_anomaly: '忽略异常',
  import_data: '导入数据',
  reset_profile: '重置剖面'
}

export const UNIT_LABELS: Record<Unit, string> = {
  meter: '米',
  foot: '英尺',
  unknown: '未标注'
}

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  pending: '待处理',
  resolved: '已处理',
  ignored: '已忽略'
}

export const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  low: '低',
  medium: '中',
  high: '高'
}

export const STRATUM_COLORS = [
  '#D2691E',
  '#DEB887',
  '#8B7355',
  '#A0522D',
  '#F5DEB3',
  '#CD853F',
  '#BC8F8F',
  '#F4A460',
  '#B8860B',
  '#8B4513'
]

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
