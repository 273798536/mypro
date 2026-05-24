export enum LedgerStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
  AUDITED = 'audited',
  EXPORTED = 'exported'
}

export enum OperationType {
  CHECK_IN = 'check_in',
  DEPOSIT = 'deposit',
  ROOM_CHANGE = 'room_change',
  EXTEND_STAY = 'extend_stay',
  INVOICE = 'invoice',
  SCAN_CODE = 'scan_code'
}

export enum Role {
  FRONT_DESK = 'front_desk',
  SUPERVISOR = 'supervisor',
  FINANCE = 'finance',
  AUDITOR = 'auditor'
}

export interface CheckInRecord {
  id: string;
  ledgerId: string;
  checkInNo: string;
  guestName: string;
  guestIdCard: string;
  roomNo: string;
  roomType: string;
  checkInTime: string;
  checkOutTime: string;
  expectedDays: number;
  roomRate: number;
  totalAmount: number;
  operator: string;
  createTime: string;
}

export interface DepositRecord {
  id: string;
  ledgerId: string;
  depositNo: string;
  checkInNo: string;
  amount: number;
  paymentMethod: string;
  operator: string;
  operateTime: string;
  remark?: string;
}

export interface RoomChangeRecord {
  id: string;
  ledgerId: string;
  changeNo: string;
  checkInNo: string;
  oldRoomNo: string;
  newRoomNo: string;
  oldRoomType: string;
  newRoomType: string;
  oldRoomRate: number;
  newRoomRate: number;
  changeTime: string;
  changeReason: string;
  operator: string;
  isMidNight: boolean;
}

export interface ScanCodeRecord {
  id: string;
  ledgerId: string;
  scanNo: string;
  checkInNo: string;
  amount: number;
  scanTime: string;
  payChannel: string;
  merchantNo: string;
  operator: string;
  status: string;
}

export interface Ledger {
  id: string;
  checkInNo: string;
  status: LedgerStatus;
  version: number;
  currentRoomNo: string;
  currentRoomRate: number;
  totalRoomFee: number;
  totalDeposit: number;
  totalInvoice: number;
  balance: number;
  hasSyncIssue: boolean;
  syncIssueDesc?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  submittedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  confirmedAt?: string;
  auditedAt?: string;
  exportedAt?: string;
}

export interface LedgerHistory {
  id: string;
  ledgerId: string;
  version: number;
  operation: string;
  operator: string;
  role: Role;
  oldStatus?: LedgerStatus;
  newStatus?: LedgerStatus;
  changedFields: string;
  changeReason?: string;
  operateTime: string;
}

export interface FailedRecord {
  id: string;
  ledgerId?: string;
  recordType: string;
  recordData: string;
  failReason: string;
  failTime: string;
  operator: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
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
}
