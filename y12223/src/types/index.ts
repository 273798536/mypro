export interface FilmProject {
  id: string;
  name: string;
  budgetTotal: number;
  budgetUsed: number;
  status: 'active' | 'completed' | 'paused';
  startDate: string;
}

export interface RemarksChange {
  id: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
}

export type BillStatus = 'normal' | 'missing_fields' | 'late_supplement' | 'category_mismatch';

export interface SupplierBill {
  id: string;
  projectId: string;
  supplierName: string;
  amount: number;
  expenseCategory: string;
  billDate: string;
  status: BillStatus;
  remarks: string;
  hasMissingFields: boolean;
  isLateSupplement: boolean;
  isCategoryMismatch: boolean;
  remarksHistory: RemarksChange[];
  originalCategory?: string;
}

export interface ReportDetail {
  category: string;
  amount: number;
  billCount: number;
}

export interface ExpenseReport {
  id: string;
  projectId: string;
  period: string;
  totalAmount: number;
  collectionCriteria: string;
  generatedAt: string;
  details: ReportDetail[];
}

export type AdjustmentType = 'category_mismatch' | 'invoice_late' | 'activity_cancelled' | 'manual_correction';

export interface AdjustmentHistory {
  id: string;
  billId?: string;
  reportId?: string;
  adjustmentType: AdjustmentType;
  beforeSnapshot: string;
  afterSnapshot: string;
  operator: string;
  operatedAt: string;
  reason: string;
}

export interface FilterConditions {
  projectId?: string;
  dateRange?: { start: string; end: string };
  expenseCategory?: string;
  status?: string;
}

export interface BillSnapshot {
  id: string;
  supplierName: string;
  amount: number;
  expenseCategory: string;
  remarks: string;
}
