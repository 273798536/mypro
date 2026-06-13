export type LightPointStatus = 'normal' | 'pending_material' | 'manual_review'

export type ReviewStage = 'initial' | 'review' | 'final'

export interface Position {
  x: number
  y: number
  z: number
}

export interface DisplayCase {
  id: string
  name: string
  position: Position
  width: number
  height: number
  depth: number
  color: string
}

export interface LightPoint {
  id: string
  name: string
  position: Position
  groupId: string
  stageStatuses: Record<ReviewStage, LightPointStatus>
  displayCaseId: string
  intensity: number
  beamAngle: number
}

export interface ReviewComment {
  id: string
  lightPointId: string
  stage: ReviewStage
  content: string
  reviewer: string
  createdAt: string
  statusAfter: LightPointStatus
}

export interface AdjacentPair {
  id: string
  pointAId: string
  pointBId: string
  issueType: 'collision_risk' | 'overlap' | 'coordinate_mismatch'
  description: string
  isResolved: boolean
}

export interface ReviewStageInfo {
  id: ReviewStage
  name: string
  orderIndex: number
}

export const STATUS_LABELS: Record<LightPointStatus, string> = {
  normal: '已处理',
  pending_material: '待补材料',
  manual_review: '人工改判',
}

export const STATUS_COLORS: Record<LightPointStatus, string> = {
  normal: '#10B981',
  pending_material: '#F59E0B',
  manual_review: '#EC4899',
}

export const STAGE_LIST: ReviewStageInfo[] = [
  { id: 'initial', name: '初评', orderIndex: 0 },
  { id: 'review', name: '复核', orderIndex: 1 },
  { id: 'final', name: '终审', orderIndex: 2 },
]
