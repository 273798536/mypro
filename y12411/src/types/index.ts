export interface InboundOrder {
  id: string
  batchNo: string
  productName: string
  categoryId: string
  quantity: number
  unit: string
  warehouse: string
  temperature: number
  tempStandard: number
  inboundDate: string
  supplier: string
  operator: string
}

export interface OutboundOrder {
  id: string
  batchNo: string
  productName: string
  categoryId: string
  quantity: number
  unit: string
  warehouse: string
  temperature: number
  tempStandard: number
  outboundDate: string
  customer: string
  operator: string
}

export type ExceptionSource = 'original' | 'supplement'

export interface TempGapException {
  id: string
  batchNo: string
  sourceType: 'inbound' | 'outbound'
  sourceId: string
  recordedTemp: number
  standardTemp: number
  gapValue: number
  duration: number
  occurredAt: string
  source: 'original'
  description: string
}

export interface BatchCrossException {
  id: string
  batchNo: string
  expectedBatchNo: string
  sourceType: 'inbound' | 'outbound'
  sourceId: string
  operator: string
  recordedAt: string
  source: 'supplement'
  description: string
}

export type LossRuleStatus = 'active' | 'supplement'

export interface LossRule {
  id: string
  ruleName: string
  category: string
  standardRate: number
  tempGapPenaltyRate: number
  crossBatchPenaltyRate: number
  status: LossRuleStatus
  createdAt: string
  supplementAt?: string
  supplementNote?: string
  affectedSettlementIds: string[]
}

export interface SettlementDetail {
  id: string
  settlementId: string
  batchNo: string
  productName: string
  inboundQty: number
  outboundQty: number
  standardLoss: number
  actualLoss: number
  tempGapLoss: number
  crossBatchLoss: number
  ruleId: string
  ruleAppliedAt: string
  ruleIsSupplement: boolean
  inboundOrderId: string
  outboundOrderId: string
  status: 'normal' | 'temp_gap' | 'cross_batch' | 'both'
}

export interface Settlement {
  id: string
  settlementNo: string
  period: string
  totalInboundQty: number
  totalOutboundQty: number
  totalStandardLoss: number
  totalActualLoss: number
  totalTempGapLoss: number
  totalCrossBatchLoss: number
  settlementDate: string
  details: SettlementDetail[]
  status: 'draft' | 'confirmed' | 'reviewed'
}

export interface UnifiedException {
  id: string
  type: 'temp_gap' | 'cross_batch'
  batchNo: string
  productName: string
  source: ExceptionSource
  sourceLabel: string
  sourceType: 'inbound' | 'outbound'
  sourceId: string
  description: string
  occurredAt: string
  lossImpact: number
  settlementDetailId?: string
}

export interface CaliberRecord {
  batchNo: string
  productName: string
  dailyLoss: number
  reviewLoss: number
  isConsistent: boolean
  diff: number
}
