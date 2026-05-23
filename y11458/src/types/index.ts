export enum IssueType {
  MISSING = 'MISSING',
  DAMAGED = 'DAMAGED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  QUANTITY_MISMATCH = 'QUANTITY_MISMATCH',
  OTHER = 'OTHER'
}

export enum DirtyRecordType {
  MISSING_FIELD = 'MISSING_FIELD',
  CROSS_DAY = 'CROSS_DAY',
  NAME_CHANGED = 'NAME_CHANGED',
  AMOUNT_CONFLICT = 'AMOUNT_CONFLICT',
  QUANTITY_CONFLICT = 'QUANTITY_CONFLICT'
}

export enum AfterSalesStatus {
  CREATED = 'CREATED',
  LEADER_SUBMITTED = 'LEADER_SUBMITTED',
  WAREHOUSE_REVIEWING = 'WAREHOUSE_REVIEWING',
  WAREHOUSE_APPROVED = 'WAREHOUSE_APPROVED',
  WAREHOUSE_REJECTED = 'WAREHOUSE_REJECTED',
  REFUNDING = 'REFUNDING',
  REFUND_SUCCESS = 'REFUND_SUCCESS',
  REFUND_FAILED = 'REFUND_FAILED',
  RECONCILING = 'RECONCILING',
  RECONCILED = 'RECONCILED',
  ABNORMAL = 'ABNORMAL',
  CLOSED = 'CLOSED'
}

export enum OperatorRole {
  LEADER = 'LEADER',
  WAREHOUSE = 'WAREHOUSE',
  FINANCE = 'FINANCE',
  SYSTEM = 'SYSTEM',
  CITY_MANAGER = 'CITY_MANAGER'
}

export interface LeaderRefund {
  id: string;
  orderNo: string;
  leaderId: string;
  leaderName: string;
  city: string;
  skuId: string;
  skuName: string;
  refundQuantity: number;
  refundAmount: number;
  reason: string;
  submitTime: string;
  images?: string[];
  rawData?: Record<string, any>;
}

export interface WarehouseReview {
  id: string;
  orderNo: string;
  reviewerId: string;
  reviewerName: string;
  skuId: string;
  skuName: string;
  actualQuantity: number;
  actualAmount: number;
  isDamaged: boolean;
  isMissing: boolean;
  reviewResult: 'APPROVED' | 'REJECTED';
  reviewRemark?: string;
  reviewTime: string;
  rawData?: Record<string, any>;
}

export interface UserRemark {
  id: string;
  orderNo: string;
  userId: string;
  userName: string;
  content: string;
  images?: string[];
  createTime: string;
  rawData?: Record<string, any>;
}

export interface RefundFlow {
  id: string;
  orderNo: string;
  flowNo: string;
  refundAmount: number;
  refundMethod: string;
  refundStatus: 'SUCCESS' | 'FAILED' | 'PROCESSING';
  operatorId: string;
  operatorName: string;
  operateTime: string;
  rawData?: Record<string, any>;
}

export interface StatusLog {
  id: string;
  orderNo: string;
  fromStatus?: AfterSalesStatus;
  toStatus: AfterSalesStatus;
  operatorId: string;
  operatorName: string;
  operatorRole: OperatorRole;
  reason: string;
  operateTime: string;
  extra?: Record<string, any>;
}

export interface DirtyRecord {
  id: string;
  sourceType: 'LEADER_REFUND' | 'WAREHOUSE_REVIEW' | 'USER_REMARK' | 'REFUND_FLOW';
  sourceId: string;
  orderNo: string;
  dirtyType: DirtyRecordType;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  suggestion: string;
  rawData: Record<string, any>;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedTime?: string;
  resolveRemark?: string;
  createTime: string;
}

export interface ReconciliationResult {
  id: string;
  orderNo: string;
  issueType: IssueType;
  leaderAmount: number;
  warehouseAmount: number;
  refundAmount: number;
  difference: number;
  isMatched: boolean;
  reconciliationRemark: string;
  reconciledBy?: string;
  reconciledTime?: string;
  createTime: string;
}

export interface AfterSalesOrder {
  orderNo: string;
  city: string;
  leaderId: string;
  leaderName: string;
  skuId: string;
  skuName: string;
  status: AfterSalesStatus;
  currentHandler?: string;
  leaderRefund?: LeaderRefund;
  warehouseReview?: WarehouseReview;
  userRemarks: UserRemark[];
  refundFlows: RefundFlow[];
  statusLogs: StatusLog[];
  dirtyRecords: DirtyRecord[];
  reconciliation?: ReconciliationResult;
  createTime: string;
  updateTime: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
