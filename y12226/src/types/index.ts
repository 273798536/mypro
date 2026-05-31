export interface DonationRecord {
  id: string;
  donorName: string;
  amount: number;
  designatedPurpose: string;
  donationDate: string;
  projectId: string;
  status: 'pending' | 'locked' | 'conflicted';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBudget {
  id: string;
  projectId: string;
  projectName: string;
  budgetAmount: number;
  purpose: string;
  matchedAmount: number;
  status: 'matched' | 'partial' | 'conflicted';
}

export interface ExpenseReceipt {
  id: string;
  donationId: string;
  projectId: string;
  amount: number;
  receiptDate: string;
  imageUrl: string;
  ocrText: string;
  status: 'linked' | 'unlinked' | 'duplicate';
  uploadedAt: string;
}

export interface PurposeLock {
  id: string;
  donationId: string;
  lockedPurpose: string;
  lockedBy: string;
  lockedAt: string;
  source: 'donation' | 'budget' | 'manual';
}

export interface ConflictLog {
  id: string;
  donationId: string;
  conflictType: 'purpose_mismatch' | 'receipt_duplicate' | 'refund_delayed';
  description: string;
  detectedAt: string;
  severity: 'high' | 'medium' | 'low';
  resolution: string;
  resolvedAt: string;
  orderIndex: number;
}

export interface ExportRecord {
  donationId: string;
  donorName: string;
  amount: number;
  designatedPurpose: string;
  lockedPurpose: string;
  projectId: string;
  projectName: string;
  budgetPurpose: string;
  receiptCount: number;
  receiptTotal: number;
  conflictCount: number;
  lockSource: string;
  lockDate: string;
}

export type ConflictType = ConflictLog['conflictType'];
export type LockSource = PurposeLock['source'];
export type DonationStatus = DonationRecord['status'];
export type BudgetStatus = ProjectBudget['status'];
export type ReceiptStatus = ExpenseReceipt['status'];
