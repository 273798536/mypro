export type CurrencyUnit = 'CNY' | 'USD' | 'EUR' | 'JPY'
export type TimeUnit = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ChannelType = 'SEARCH' | 'DISPLAY' | 'SOCIAL' | 'VIDEO' | 'APP'
export type ConversionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'DELAYED'
export type AlertType = 'BUDGET_EXHAUSTED' | 'CONVERSION_DELAYED' | 'DUPLICATE_MATERIAL' | 'DATA_CONFLICT' | 'MANUAL_MODIFICATION'
export type RecordSource = 'AUTO' | 'MANUAL' | 'SUPPLEMENTARY'

export interface ChannelData {
  id: string
  channelName: string
  channelType: ChannelType
  currencyUnit: CurrencyUnit
  budget: number
  spentBudget: number
  remainingBudget: number
  dailyBudget: number
  startDate: string
  endDate: string
  materialIds: string[]
  conversionRate: number
  cpc: number
  cpm: number
  impressions: number
  clicks: number
  createdAt: string
  updatedAt: string
}

export interface ConversionData {
  id: string
  channelId: string
  materialId: string
  conversionDate: string
  attributionDate: string
  conversionCount: number
  conversionValue: number
  delayDays: number
  status: ConversionStatus
  unitPrice: number
  currencyUnit: CurrencyUnit
  remark?: string
  isSupplementary: boolean
  supplementaryAt?: string
  affectedRecordIds: string[]
}

export interface BudgetAllocationDetail {
  id: string
  channelId: string
  channelName: string
  allocatedBudget: number
  originalAllocatedBudget: number
  marginalRevenue: number
  originalMarginalRevenue: number
  isMarginalRevenueModified: boolean
  modifiedAt?: string
  modifiedBy?: string
  modificationReason?: string
  expectedConversions: number
  actualConversions: number
  roi: number
  priority: number
  source: RecordSource
}

export interface BudgetAllocationReport {
  id: string
  reportDate: string
  totalBudget: number
  allocatedBudget: number
  remainingBudget: number
  details: BudgetAllocationDetail[]
  createdAt: string
  generatedBy: string
  hasManualModifications: boolean
  hasSupplementaryRecords: boolean
  modificationTraces: ModificationTrace[]
}

export interface ModificationTrace {
  id: string
  fieldName: string
  oldValue: number
  newValue: number
  modifiedAt: string
  modifiedBy: string
  reason: string
  affectedDetailIds: string[]
}

export interface AlertMessage {
  id: string
  type: AlertType
  level: 'WARNING' | 'ERROR' | 'INFO'
  title: string
  message: string
  relatedObjectId: string
  relatedObjectName: string
  relatedObjectType: 'CHANNEL' | 'MATERIAL' | 'CONVERSION' | 'ALLOCATION'
  timestamp: string
  isRead: boolean
  data?: Record<string, any>
}

export interface Material {
  id: string
  name: string
  hash: string
  channelIds: string[]
  isDuplicate: boolean
  duplicateOf?: string
  createdAt: string
}

export interface BiddingRecord {
  id: string
  channelId: string
  materialId: string
  bidAmount: number
  bidTime: string
  remark?: string
  isSupplementary: boolean
  supplementaryAt?: string
  affectedAllocationIds: string[]
  currencyUnit: CurrencyUnit
}

export interface DataConflict {
  id: string
  fieldName: string
  sourceA: {
    source: string
    value: number | string
    unit?: string
  }
  sourceB: {
    source: string
    value: number | string
    unit?: string
  }
  channelId: string
  detectedAt: string
  resolved: boolean
  resolution?: string
  resolvedAt?: string
}

export interface BudgetPlaybackSnapshot {
  id: string
  snapshotTime: string
  reportId: string
  state: BudgetAllocationReport
  description: string
}
