import type { Vec3 } from './corridor'

export type ConflictType = 'valve_duplicate' | 'route_forbidden' | 'model_mismatch'
export type ConflictStatus = 'open' | 'investigating' | 'resolved' | 'accepted'

export interface EvidenceItem {
  id: string
  type: 'screenshot' | 'workorder' | 'model_snapshot' | 'annotation'
  url: string
  dataUrl?: string
  timestamp: string
  description: string
  metadata?: {
    routeVersion?: string
    userName?: string
    viewMode?: string
    layers?: string[]
  }
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
