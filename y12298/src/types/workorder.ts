import type { EvidenceItem } from './conflict'

export type WorkOrderType = 'valve_correction' | 'route_update' | 'conflict_investigation' | 'model_update'
export type WorkOrderStatus = 'open' | 'in_progress' | 'closed'

export interface WorkOrderComment {
  id: string
  author: string
  content: string
  timestamp: string
  attachments?: EvidenceItem[]
}

export interface WorkOrder {
  id: string
  title: string
  description: string
  type: WorkOrderType
  status: WorkOrderStatus
  creator: string
  assignee?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  relatedRouteIds: string[]
  relatedValveIds: string[]
  relatedConflictIds: string[]
  attachments: EvidenceItem[]
  comments: WorkOrderComment[]
}
