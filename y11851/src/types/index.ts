export type PipelineType = 'gas' | 'power' | 'drainage'

export type ConflictType = 'elevation' | 'crossing' | 'obsolete'

export type ConflictSeverity = 'high' | 'medium' | 'low'

export type CoordinationStatus = 'pending' | 'confirmed' | 'obsolete_invalidated'

export interface PipelineSegment {
  id: string
  type: PipelineType
  version: string
  path: [number, number, number][]
  depth: number
  diameter: number
  isObsolete: boolean
  label: string
}

export interface ManholePoint {
  id: string
  label: string
  position: [number, number, number]
  linkedPipelineId: string
  elevation: number
  type: PipelineType
}

export interface ExcavationZone {
  id: string
  label: string
  center: [number, number, number]
  size: [number, number, number]
  depth: number
}

export interface ConflictRecord {
  id: string
  type: ConflictType
  involvedPipelineIds: string[]
  involvedManholeIds: string[]
  description: string
  position: [number, number, number]
  severity: ConflictSeverity
}

export interface CoordinationRecord {
  id: string
  conflictId: string
  date: string
  parties: string
  content: string
  status: CoordinationStatus
  resolution: string
}

export interface Viewpoint {
  id: string
  name: string
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  timestamp: number
}

export interface ClippingState {
  enabled: boolean
  mode: 'horizontal' | 'vertical'
  horizontalY: number
  verticalX: number
  verticalZ: number
}

export interface LayerVisibility {
  gas: boolean
  power: boolean
  drainage: boolean
  manholes: boolean
  excavation: boolean
  conflicts: boolean
}

export interface LayerOpacity {
  gas: number
  power: number
  drainage: number
  excavation: number
}

export interface VersionFilter {
  gas: string
  power: string
  drainage: string
}

export const PIPELINE_COLORS: Record<PipelineType, string> = {
  gas: '#e67e22',
  power: '#f1c40f',
  drainage: '#3498db',
}

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  elevation: '标高冲突',
  crossing: '管线交叉',
  obsolete: '旧图未作废',
}

export const CONFLICT_SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  high: '#e74c3c',
  medium: '#e67e22',
  low: '#f1c40f',
}

export const COORDINATION_STATUS_LABELS: Record<CoordinationStatus, string> = {
  pending: '待协调',
  confirmed: '已确认',
  obsolete_invalidated: '旧图作废',
}

export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  gas: '燃气',
  power: '电力',
  drainage: '排水',
}
