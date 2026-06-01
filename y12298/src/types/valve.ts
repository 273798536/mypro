import type { Vec3 } from './corridor'

export type ValveStatus = 'normal' | 'duplicate' | 'mismatch' | 'maintenance'
export type ValveType = 'gate' | 'ball' | 'butterfly' | 'check'

export interface Valve {
  id: string
  tagNumber: string
  nodeId: string
  position: Vec3
  modelRemark: string
  status: ValveStatus
  type: ValveType
  lastInspectionDate?: string
  workOrderIds: string[]
}

export interface DuplicateValveGroup {
  tagNumber: string
  valves: Valve[]
  detectedAt: string
  workOrderId?: string
  resolved: boolean
}
