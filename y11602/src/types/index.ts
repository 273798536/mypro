export type LoanStatus = 'normal' | 'warning' | 'expiring_soon' | 'expired' | 'abnormal';
export type AnomalyType = 'guarantee_expired' | 'missing_repayment' | 'approval_withdrawn' | 'expiring_soon';
export type ApprovalResult = 'approved' | 'rejected' | 'pending' | 'withdrawn';
export type GuaranteeType = 'mortgage' | 'pledge' | 'guarantor';
export type GuaranteeStatus = 'valid' | 'expiring_soon' | 'expired';
export type RepaymentStatus = 'normal' | 'overdue' | 'missing';
export type ReminderType = 'phone' | 'sms' | 'visit';
export type Severity = 'high' | 'medium' | 'low';
export type UserRole = 'manager' | 'executive';

export interface Customer {
  id: string;
  name: string;
  idCard: string;
  creditAmount: number;
  startDate: string;
  expiryDate: string;
  status: LoanStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  anomalies: Anomaly[];
}

export interface Repayment {
  id: string;
  customerId: string;
  month: string;
  amount: number;
  status: RepaymentStatus;
  source: string;
}

export interface Guarantee {
  id: string;
  customerId: string;
  type: GuaranteeType;
  guarantor: string;
  startDate: string;
  expiryDate: string;
  status: GuaranteeStatus;
  source: string;
}

export interface Approval {
  id: string;
  customerId: string;
  stage: string;
  result: ApprovalResult;
  opinion: string;
  operator: string;
  timestamp: string;
  isWithdrawn: boolean;
  source: string;
}

export interface Reminder {
  id: string;
  customerId: string;
  type: ReminderType;
  content: string;
  operator: string;
  timestamp: string;
  source: string;
}

export interface AuditLog {
  id: string;
  customerId: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: string;
  reason: string;
}

export interface Anomaly {
  type: AnomalyType;
  severity: Severity;
  message: string;
  detectedAt: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

export interface AppState {
  currentUser: User | null;
  customers: Customer[];
  repayments: Repayment[];
  guarantees: Guarantee[];
  approvals: Approval[];
  reminders: Reminder[];
  auditLogs: AuditLog[];
  selectedCustomerId: string | null;
  filters: {
    status: LoanStatus | 'all';
    search: string;
    sortBy: 'expiryDate' | 'name' | 'creditAmount';
    sortOrder: 'asc' | 'desc';
  };
}

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'SET_REPAYMENTS'; payload: Repayment[] }
  | { type: 'ADD_REPAYMENT'; payload: Repayment }
  | { type: 'SET_GUARANTEES'; payload: Guarantee[] }
  | { type: 'ADD_GUARANTEE'; payload: Guarantee }
  | { type: 'SET_APPROVALS'; payload: Approval[] }
  | { type: 'ADD_APPROVAL'; payload: Approval }
  | { type: 'SET_REMINDERS'; payload: Reminder[] }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'SET_AUDIT_LOGS'; payload: AuditLog[] }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog }
  | { type: 'SET_SELECTED_CUSTOMER'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'LOAD_SAMPLE_DATA' }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'IMPORT_MULTI_SOURCE'; payload: {
      customers: Customer[];
      repayments: Repayment[];
      guarantees: Guarantee[];
      approvals: Approval[];
    } };

export interface ImportResult<T> {
  success: boolean;
  data: T;
  errors: string[];
  warnings: string[];
}

export interface MultiSourceImportData {
  customers: Customer[];
  repayments: Repayment[];
  guarantees: Guarantee[];
  approvals: Approval[];
}
