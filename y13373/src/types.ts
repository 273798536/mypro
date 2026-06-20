export type RecordStatus = "pending" | "confirmed" | "withdrawn"
export type RecordType = "failure" | "normal"

export interface StatusChange {
  from: RecordStatus
  to: RecordStatus
  timestamp: string
  note?: string
}

export interface QueueRecord {
  id: string
  taskId: string
  taskName: string
  type: RecordType
  status: RecordStatus
  isContaminated: boolean
  failureLog: string
  gpuCost: number
  duration: number
  model: string
  dataset: string
  createdAt: string
  updatedAt: string
  statusHistory: StatusChange[]
}

export interface SummaryStats {
  total: number
  failure: number
  normal: number
  confirmed: number
  pending: number
  contaminated: number
}

export type FilterType = "all" | RecordType
export type FilterStatus = "all" | RecordStatus
export type FilterContamination = "all" | "contaminated" | "clean"
