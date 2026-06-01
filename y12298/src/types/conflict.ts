import type { Vec3 } from './corridor'

export type ConflictType = 'valve_duplicate' | 'route_forbidden' | 'model_mismatch'
export type ConflictStatus = 'open' | 'investigating' | 'resolved' | 'accepted'

export interface EvidenceItem {
  id: string
  type: 'screenshot' | 'workorder' | 'model_snapshot' | 'annotation'
  url: string
  timestamp: string
  description: string
}

export interface Conflict {
  id: string
  type: ConflictType
  title: string
  description: string
  position?: Vec3
  relatedRouteIds?: string[]
  relatedValveIds?: string[]
  status: ConflictStatus
  detectedAt: string
  workOrderId?: string
  evidence: EvidenceItem[]
}
