export type UserRole = 'entry' | 'review' | 'supervisor' | 'readonly';

export type RecordSource = 'checkin' | 'deposit' | 'roomChange' | 'shift' | 'supplement';

export type DirtyType = 
  | 'missing_field' 
  | 'cross_day' 
  | 'name_changed' 
  | 'amount_conflict' 
  | 'quantity_conflict'
  | 'duplicate'
  | 'invalid_data';

export type RecordStatus = 
  | 'pending' 
  | 'imported' 
  | 'checking' 
  | 'dirty' 
  | 'fixed' 
  | 'verified' 
  | 'rejected'
  | 'exported';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export interface AuthContext {
  user: User;
  timestamp: string;
}

export interface CheckinRecord {
  id: string;
  sourceRowNumber: number;
  sourceFile: string;
  orderNo: string;
  guestName: string;
  idCard: string;
  roomNo: string;
  roomType: string;
  checkinDate: string;
  checkoutDate: string;
  actualCheckoutDate?: string;
  roomRate: number;
  depositAmount: number;
  operator: string;
  status: string;
  remarks?: string;
  source: RecordSource;
  importBatch: string;
  importedAt: string;
  importedBy: string;
}

export interface DepositRecord {
  id: string;
  sourceRowNumber: number;
  sourceFile: string;
  transactionNo: string;
  orderNo: string;
  guestName: string;
  amount: number;
  paymentMethod: string;
  transactionType: 'deposit' | 'refund' | 'consume';
  operator: string;
  transactionTime: string;
  remarks?: string;
  source: RecordSource;
  importBatch: string;
  importedAt: string;
  importedBy: string;
}

export interface RoomChangeRecord {
  id: string;
  sourceRowNumber: number;
  sourceFile: string;
  changeNo: string;
  orderNo: string;
  guestName: string;
  oldRoomNo: string;
  newRoomNo: string;
  oldRoomType: string;
  newRoomType: string;
  oldRoomRate: number;
  newRoomRate: number;
  changeTime: string;
  operator: string;
  reason?: string;
  source: RecordSource;
  importBatch: string;
  importedAt: string;
  importedBy: string;
}

export interface ShiftRecord {
  id: string;
  sourceRowNumber: number;
  sourceFile: string;
  shiftNo: string;
  shiftDate: string;
  shiftType: 'morning' | 'afternoon' | 'night';
  operator: string;
  checkinCount: number;
  checkoutCount: number;
  totalDeposit: number;
  totalRefund: number;
  totalRevenue: number;
  handoverTime: string;
  source: RecordSource;
  importBatch: string;
  importedAt: string;
  importedBy: string;
}

export interface SupplementRecord {
  id: string;
  sourceRowNumber: number;
  sourceFile: string;
  supplementNo: string;
  orderNo: string;
  guestName: string;
  supplementType: string;
  amount: number;
  operator: string;
  supplementTime: string;
  reason?: string;
  source: RecordSource;
  importBatch: string;
  importedAt: string;
  importedBy: string;
}

export type SourceRecord = 
  | CheckinRecord 
  | DepositRecord 
  | RoomChangeRecord 
  | ShiftRecord
  | SupplementRecord;

export interface DirtyRecord {
  id: string;
  recordId: string;
  recordType: RecordSource;
  dirtyType: DirtyType;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  description: string;
  originalContent: Record<string, unknown>;
  suggestion?: string;
  status: 'pending' | 'fixed' | 'ignored';
  fixedBy?: string;
  fixedAt?: string;
  fixRemark?: string;
  detectedAt: string;
  detectedBy: string;
  importBatch: string;
}

export interface StatusChange {
  id: string;
  recordId: string;
  recordType: RecordSource;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
  operator: string;
  operatorRole: UserRole;
  reason: string;
  timestamp: string;
  importBatch: string;
}

export interface ImportBatch {
  id: string;
  batchNo: string;
  batchDate: string;
  source: RecordSource;
  fileName: string;
  totalRecords: number;
  importedRecords: number;
  dirtyRecords: number;
  fixedRecords: number;
  status: 'importing' | 'imported' | 'checking' | 'completed' | 'archived';
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  remarks?: string;
}

export interface AuditReport {
  id: string;
  batchNo: string;
  reportDate: string;
  generatedBy: string;
  generatedAt: string;
  summary: {
    totalRecords: number;
    cleanRecords: number;
    dirtyRecords: number;
    fixedRecords: number;
    pendingRecords: number;
    crossDayIssues: number;
    amountConflicts: number;
    nameChanges: number;
    missingFields: number;
  };
  dirtyRecords: DirtyRecord[];
  statusChanges: StatusChange[];
  exportReady: boolean;
}

export interface DatabaseSchema {
  users: User[];
  checkinRecords: CheckinRecord[];
  depositRecords: DepositRecord[];
  roomChangeRecords: RoomChangeRecord[];
  shiftRecords: ShiftRecord[];
  supplementRecords: SupplementRecord[];
  dirtyRecords: DirtyRecord[];
  statusChanges: StatusChange[];
  importBatches: ImportBatch[];
  auditReports: AuditReport[];
  currentUser: string | null;
  config: {
    initialized: boolean;
    initializedAt: string;
    dataDirectory: string;
  };
}
