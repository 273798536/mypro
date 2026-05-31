export type DataSource = 'contract' | 'boxoffice' | 'expense'
export type SettlementStatus = 'pending' | 'calculating' | 'success' | 'failed' | 'blocked'
export type ExceptionType = 'guarantee_shortfall' | 'promo_deduction' | 'cross_period_adjustment' | 'settlement_failed'
export type OperationType = 'import' | 'create' | 'update' | 'delete' | 'calculate' | 'export' | 'status_change'

export interface UserInfo {
  id: string
  name: string
  department: string
}

export interface RawMaterial {
  id: string
  sourceType: DataSource
  fileName: string
  fileSize: number
  uploadTime: string
  uploader: UserInfo
  originalData: Record<string, any>[]
  processedCount: number
  remark: string
}

export interface FilmContract {
  id: string
  filmName: string
  contractNo: string
  contractDate: string
  distributor: string
  producer: string
  guaranteeAmount: number
  guaranteeBoxOffice: number
  producerShareRate: number
  distributorShareRate: number
  promoBudget: number
  settlementCycle: string
  validFrom: string
  validTo: string
  status: 'active' | 'terminated' | 'completed'
  createdAt: string
  createdBy: UserInfo
  updatedAt: string
  updatedBy: UserInfo
  rawMaterialId?: string
  remark: string
}

export interface BoxOfficeFlow {
  id: string
  contractId: string
  filmName: string
  flowDate: string
  cinemaName: string
  boxOfficeAmount: number
  serviceFee: number
  netBoxOffice: number
  settlementPeriod: string
  status: 'pending' | 'confirmed' | 'reconciled'
  createdAt: string
  createdBy: UserInfo
  updatedAt: string
  updatedBy: UserInfo
  rawMaterialId?: string
  remark: string
}

export interface PromoExpense {
  id: string
  contractId: string
  filmName: string
  expenseDate: string
  expenseType: string
  expenseItem: string
  amount: number
  bearer: 'producer' | 'distributor' | 'shared'
  shareRate: number
  settlementPeriod: string
  isDeducted: boolean
  deductionPeriod: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  createdBy: UserInfo
  updatedAt: string
  updatedBy: UserInfo
  rawMaterialId?: string
  remark: string
}

export interface GuaranteeComparison {
  id: string
  contractId: string
  calculationBasis: string[]
  actualBoxOffice: number
  guaranteeBoxOffice: number
  guaranteeAmount: number
  calculatedShare: number
  guaranteeComparison: 'above' | 'equal' | 'below'
  difference: number
  basisEvidence: string[]
  createdAt: string
  calculatedBy: UserInfo
}

export interface SettlementException {
  id: string
  contractId: string
  settlementId: string
  type: ExceptionType
  title: string
  description: string
  triggeredBy: UserInfo
  triggeredAt: string
  blockingPoint: string
  nextAction: string
  responsiblePerson: string
  status: 'open' | 'in_progress' | 'resolved' | 'ignored'
  resolvedAt?: string
  resolvedBy?: UserInfo
  resolution?: string
  relatedDataIds: string[]
}

export interface SettlementResult {
  id: string
  contractId: string
  filmName: string
  settlementPeriod: string
  totalBoxOffice: number
  totalNetBoxOffice: number
  producerShare: number
  distributorShare: number
  totalPromoExpense: number
  producerPromoShare: number
  distributorPromoShare: number
  guaranteeComparison: GuaranteeComparison
  actualPayable: number
  status: SettlementStatus
  failureReason?: string
  exceptions: SettlementException[]
  createdAt: string
  createdBy: UserInfo
  updatedAt: string
  updatedBy: UserInfo
  calculatedAt?: string
  calculatedBy?: UserInfo
  remark: string
}

export interface OperationLog {
  id: string
  operationType: OperationType
  entityType: string
  entityId: string
  entityName: string
  beforeChange: Record<string, any> | null
  afterChange: Record<string, any> | null
  changedFields: string[]
  operator: UserInfo
  operateAt: string
  ipAddress: string
  remark: string
}

export interface ImpactTrace {
  id: string
  sourceEntity: string
  sourceId: string
  sourceField: string
  targetEntity: string
  targetId: string
  targetField: string
  impactType: 'value_change' | 'status_change' | 'exception_trigger'
  impactDescription: string
  createdAt: string
  createdBy: UserInfo
}
