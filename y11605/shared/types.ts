export type ParticipantStatus = 'pending' | 'calculated' | 'confirmed' | 'frozen' | 'refunded'

export type BatchStatus = 'draft' | 'pending' | 'frozen' | 'executing' | 'completed' | 'cancelled'

export type EarlyBirdHandling = 'full_refund' | 'deduct_discount' | 'custom'

export type ExportType = 'refund_detail' | 'allocation_report' | 'audit_log'

export interface Participant {
  id: string
  userId: string
  userName: string
  userPhone: string
  orderNo: string
  tierId: string
  tierName: string
  payChannel: string
  payAmount: number
  earlyBirdDiscount: number
  giftValue: number
  giftShipped: boolean
  status: ParticipantStatus
  refundAmount: number | null
  feeAmount: number | null
  actualRefund: number | null
  anomalies: string[] | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface Tier {
  id: string
  name: string
  price: number
  giftValue: number
  description: string | null
  createdAt: string
}

export interface ChannelConfig {
  id: string
  channel: string
  feeRate: number
  fixedFee: number
  createdAt: string
}

export interface RefundRule {
  id: string
  name: string
  deductFee: boolean
  giftDeductRate: number
  earlyBirdHandling: EarlyBirdHandling
  customEarlyBirdRate: number
  createdAt: string
}

export interface RefundBatch {
  id: string
  name: string
  status: BatchStatus
  ruleId: string | null
  totalAmount: number
  totalFee: number
  totalActualRefund: number
  frozenAt: string | null
  frozenBy: string | null
  executedAt: string | null
  createdBy: string
  createdAt: string
  items?: BatchItem[]
}

export interface BatchItem {
  id: string
  batchId: string
  participantId: string
  snapshotRefundAmount: number
  snapshotFeeAmount: number
  snapshotActualRefund: number
  participant?: Participant
}

export interface AuditLog {
  id: string
  entityType: 'participant' | 'batch' | 'rule'
  entityId: string
  action: string
  beforeSnapshot: any
  afterSnapshot: any
  operator: string
  reason: string | null
  timestamp: string
}

export interface ExportRecord {
  id: string
  type: ExportType
  batchId: string | null
  filters: any
  filePath: string
  fileSize: number
  createdBy: string
  createdAt: string
}

export interface CalculationResult {
  participantId: string
  refundAmount: number
  feeAmount: number
  actualRefund: number
  anomalies: string[]
}

export interface CreateBatchRequest {
  name: string
  participantIds: string[]
  ruleId?: string
}

export interface UpdateParticipantRequest {
  refundAmount?: number
  feeAmount?: number
  actualRefund?: number
  status?: ParticipantStatus
  reason: string
  version: number
}

export interface CalculateRequest {
  participantIds: string[]
  ruleId: string
}
