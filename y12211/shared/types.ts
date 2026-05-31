export type TicketType = 'SINGLE' | 'COMBO'
export type OrderStatus = 'PENDING' | 'PROCESSED' | 'EXCEPTION'
export type ExceptionType = 'COMBO_SPLIT' | 'REFUND_CROSS' | 'SPONSORSHIP' | 'DATA_CONFLICT' | 'RULE_MISSING'
export type ExceptionSeverity = 'PENDING' | 'ERROR'
export type ExceptionStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED'
export type SplitResultStatus = 'CONFIRMED' | 'PENDING'

export interface TicketOrder {
  id: string
  orderNo: string
  exhibitionId: string
  exhibitionName: string
  ticketType: TicketType
  totalAmount: number
  ticketCount: number
  buyerName?: string
  buyerPhone?: string
  orderTime: string
  status: OrderStatus
  splitRuleId?: string
  isComboSplit: boolean
  hasRefund: boolean
  refundCrossExhibition: boolean
  createdAt: string
  updatedAt: string
}

export interface DerivativeSale {
  id: string
  saleNo: string
  orderId?: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleTime: string
  isSupplementary: boolean
  supplementaryNote?: string
  createdAt: string
}

export interface SplitRule {
  id: string
  ruleName: string
  exhibitionId: string
  currentVersion: number
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface WaterfallStep {
  id: string
  name: string
  recipient: string
  type: 'FIXED' | 'PERCENTAGE'
  value: number
  priority: number
}

export interface RuleVersion {
  id: string
  ruleId: string
  version: number
  waterfallConfig: WaterfallStep[]
  changeNote: string
  effectiveTime: string
  createdBy?: string
  createdAt: string
}

export interface SplitDetail {
  stepId: string
  stepName: string
  recipient: string
  amount: number
}

export interface SplitResult {
  id: string
  orderId: string
  ruleId: string
  ruleVersion: number
  totalAmount: number
  splitDetails: SplitDetail[]
  hasSponsorshipDeduction: boolean
  sponsorshipAmount: number
  finalAmount: number
  splitTime: string
  status: SplitResultStatus
  createdAt: string
}

export interface ExceptionItem {
  id: string
  orderId: string
  resultId?: string
  type: ExceptionType
  severity: ExceptionSeverity
  title: string
  description?: string
  status: ExceptionStatus
  assignee?: string
  resolvedAt?: string
  resolutionNote?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface CreateOrderData {
  exhibitionId: string
  exhibitionName: string
  ticketType: TicketType
  totalAmount: number
  ticketCount: number
  buyerName?: string
  buyerPhone?: string
  orderTime: string
  isComboSplit?: boolean
  hasRefund?: boolean
  refundCrossExhibition?: boolean
}

export interface CreateDerivativeData {
  orderId?: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  saleTime: string
  isSupplementary?: boolean
  supplementaryNote?: string
}

export interface CreateRuleData {
  ruleName: string
  exhibitionId: string
  waterfallConfig: WaterfallStep[]
  changeNote: string
  effectiveTime: string
}

export interface ResolveExceptionData {
  resolutionNote: string
  shouldRecalculate: boolean
}

export interface DashboardStats {
  todayOrders: number
  pendingExceptions: number
  errorExceptions: number
  splitCompletionRate: number
  weeklyTrend: { date: string; orders: number; processed: number }[]
}
