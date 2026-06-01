import type { Vec3 } from './corridor'

export interface RoutePoint {
  nodeId: string
  position: Vec3
  arrivalTime?: string
  stayDuration?: number
}

export type RouteStatus = 'draft' | 'active' | 'deprecated' | 'failed'

export interface InspectionRoute {
  id: string
  version: string
  name: string
  points: RoutePoint[]
  status: RouteStatus
  failedReason?: string
  creator: string
  createdAt: string
  workOrderId?: string
  snapshotUrl?: string
  remark: string
}

export interface RouteVersion {
  version: string
  route: InspectionRoute
  timestamp: string
  operator: string
  changeLog: string
}
