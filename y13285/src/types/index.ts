export type LedgerStatus = 'pending' | 'merged' | 'pending_confirm' | 'withdrawn';

export type ExceptionType = 'old_override_new' | 'same_street_complaints';

export type ExceptionStatus = 'pending' | 'confirmed' | 'skipped';

export type ActionType = 'merge' | 'withdraw' | 'confirm' | 'skip';

export interface ApprovalLedger {
  id: string;
  projectName: string;
  street: string;
  pointLocation: string;
  applicant: string;
  approvalDate: string;
  schemeVersion: string;
  status: LedgerStatus;
  complaintContent?: string;
  remarks?: string;
  createdAt: string;
}

export interface ProcessingRecord {
  id: string;
  ledgerIds: string[];
  action: ActionType;
  operator: string;
  operateTime: string;
  result: string;
  mergedPoint?: string;
  reason?: string;
}

export interface ExceptionQueue {
  id: string;
  ledgerIds: string[];
  exceptionType: ExceptionType;
  reason: string;
  impactScope: string;
  status: ExceptionStatus;
  createdAt: string;
}

export interface AppState {
  ledgers: ApprovalLedger[];
  records: ProcessingRecord[];
  exceptions: ExceptionQueue[];
  activeTab: 'ledger' | 'record' | 'exception';
  setActiveTab: (tab: 'ledger' | 'record' | 'exception') => void;
  loadMockData: () => void;
  importLedgers: (data: ApprovalLedger[]) => void;
  reRunMerge: () => void;
  confirmException: (exceptionId: string) => void;
  skipException: (exceptionId: string) => void;
  withdrawRecord: (recordId: string) => void;
  clearAll: () => void;
}
