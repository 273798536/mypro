export type AccountType = '普通' | '银卡' | '金卡' | '白金卡';
export type TransactionType = '累积' | '兑换' | '过期' | '退回' | '调整';
export type BusinessType = '正常' | '升舱' | '活动赠送' | '系统调整';
export type TransactionStatus = '待处理' | '已完成' | '已取消';
export type ExchangeType = '机票' | '升舱' | '礼品' | '积分';
export type OrderStatus = '待审核' | '已审核' | '已兑付' | '已退回';
export type ProcessStatus = '未处理' | '已冲回' | '已豁免';
export type BusinessCategory = '正常' | '升舱退回' | '活动双倍' | '里程过期';
export type ReviewStatus = '未复核' | '复核中' | '已复核' | '已冲回';
export type SourceType = '会员账户' | '里程流水' | '兑换订单' | '过期日历';
export type ErrorType = '空行' | '缺列' | '格式错误' | '数据异常';
export type OperationType = '导入' | '刷新' | '复核' | '导出' | '冲回' | '修改';

export interface MemberAccount {
  id: string;
  memberNo: string;
  memberName: string;
  accountType: AccountType;
  totalMiles: number;
  usedMiles: number;
  remainingMiles: number;
  expireDate: string;
  lastTransactionDate: string;
  createTime: string;
  updateTime: string;
  remark?: string;
}

export interface MileageTransaction {
  id: string;
  memberNo: string;
  transactionType: TransactionType;
  businessType: BusinessType;
  miles: number;
  transactionDate: string;
  orderNo?: string;
  activityId?: string;
  description: string;
  operator: string;
  status: TransactionStatus;
  remark?: string;
}

export interface ExchangeOrder {
  id: string;
  orderNo: string;
  memberNo: string;
  exchangeType: ExchangeType;
  miles: number;
  amount: number;
  applyDate: string;
  status: OrderStatus;
  auditor?: string;
  auditTime?: string;
  payoutTime?: string;
  rejectReason?: string;
  remark?: string;
}

export interface ExpireCalendar {
  id: string;
  memberNo: string;
  batchNo: string;
  expireDate: string;
  milesToExpire: number;
  actualExpiredMiles: number;
  isExpired: boolean;
  expireReason: string;
  processStatus: ProcessStatus;
  processor?: string;
  processTime?: string;
  remark?: string;
}

export interface EstimateDetail {
  formula: string;
  parameters: {
    remainingMiles: number;
    liabilityCoefficient: number;
    probabilityCoefficient: number;
  };
  calculationProcess: string;
  calculator: string;
  calculateTime: string;
}

export interface LiabilityRecord {
  id: string;
  memberNo: string;
  memberName: string;
  accountType: AccountType;
  remainingMiles: number;
  liabilityCoefficient: number;
  probabilityCoefficient: number;
  estimatedLiability: number;
  businessCategory: BusinessCategory;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  reviewTime?: string;
  reviewComment?: string;
  isExpired: boolean;
  expireDate?: string;
  latestTransaction: MileageTransaction | null;
  exchangeOrders: ExchangeOrder[];
  expireRecords: ExpireCalendar[];
  estimateDetail: EstimateDetail;
  createTime: string;
  updateTime: string;
}

export interface BadRecord {
  id: string;
  sourceType: SourceType;
  sourceFile: string;
  rowNumber: number;
  errorType: ErrorType;
  errorDescription: string;
  originalData: Record<string, any>;
  repairSuggestion: string;
  isProcessed: boolean;
  processor?: string;
  processTime?: string;
  importBatchNo: string;
  createTime: string;
}

export interface OperationLog {
  id: string;
  operator: string;
  operationType: OperationType;
  targetType: string;
  targetId: string;
  beforeData: Record<string, any> | null;
  afterData: Record<string, any> | null;
  detail: string;
  createTime: string;
}

export interface LiabilityFilters {
  memberNo?: string;
  memberName?: string;
  accountType?: AccountType[];
  minMiles?: number;
  maxMiles?: number;
  minLiability?: number;
  maxLiability?: number;
  expireDateFrom?: string;
  expireDateTo?: string;
  businessCategory?: BusinessCategory[];
  reviewStatus?: ReviewStatus[];
  includeExpired?: boolean;
}

export interface TraceNode {
  id: string;
  type: 'estimate' | 'exchange' | 'expire' | 'review';
  title: string;
  description: string;
  time: string;
  operator?: string;
  status: 'normal' | 'warning' | 'error';
  data: Record<string, any>;
  children?: TraceNode[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  badRows: number;
  badRecords: BadRecord[];
  batchNo: string;
}

export interface RefreshResult {
  added: number;
  updated: number;
  unchanged: number;
  backupKey: string;
}

export interface ExportConfig {
  fields: string[];
  format: 'xlsx' | 'csv';
  fileName: string;
  filters?: LiabilityFilters;
  includeBadRecords?: boolean;
}

export interface ValidationResult<T> {
  valid: boolean;
  data: T[];
  badRecords: BadRecord[];
  stats: {
    totalRows: number;
    validRows: number;
    badRows: number;
    errorTypeCount: Record<string, number>;
  };
}

export interface Activity {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  description: string;
}
