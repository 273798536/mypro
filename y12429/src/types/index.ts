export type MilestoneStatus = 'pending' | 'verified' | 'rejected' | 'supplementary' | 'completed';
export type InvoiceStatus = 'pending' | 'issued' | 'reversed' | 'paid';
export type RecordType = 'normal' | 'sales_supplement' | 'correction';
export type VerificationResult = 'pass' | 'fail' | 'need_evidence';

export interface LicenseContract {
  id: string;
  contractNo: string;
  contractName: string;
  licensee: string;
  licensor: string;
  contractDate: string;
  effectiveDate: string;
  expirationDate: string;
  totalAmount: number;
  currency: string;
  patentNos: string[];
  paymentTerms: string;
  status: 'active' | 'expired' | 'terminated';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  milestoneNo: string;
  description: string;
  dueDate: string;
  amount: number;
  completionDate?: string;
  evidenceFiles: EvidenceFile[];
  status: MilestoneStatus;
  verificationResult?: VerificationResult;
  verificationRemark?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  evidenceType: 'milestone_proof' | 'contract_attachment' | 'email' | 'other';
  description?: string;
}

export interface InvoiceRecord {
  id: string;
  milestoneId: string;
  contractId: string;
  invoiceNo: string;
  invoiceDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  reverseReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  issuedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesSupplement {
  id: string;
  milestoneId: string;
  contractId: string;
  reportDate: string;
  reportedBy: string;
  department: string;
  supplementReason: string;
  supplementaryAmount: number;
  originalAmount: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approvedAt?: string;
  approvalRemark?: string;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  recordId: string;
  recordType: 'contract' | 'milestone' | 'invoice' | 'supplement';
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  changeReason: string;
}

export interface VerificationRecord {
  id: string;
  milestoneId: string;
  verifier: string;
  verificationDate: string;
  result: VerificationResult;
  remark: string;
  evidenceChecked: string[];
  discrepancies: DiscrepancyItem[];
}

export interface DiscrepancyItem {
  id: string;
  field: string;
  expected: string;
  actual: string;
  description: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CollectionRecord {
  id: string;
  contractId: string;
  contract: LicenseContract;
  milestoneId: string;
  milestone: Milestone;
  recordType: RecordType;
  plannedAmount: number;
  actualAmount: number;
  difference: number;
  differenceReason?: string;
  invoices: InvoiceRecord[];
  supplements: SalesSupplement[];
  verificationRecords: VerificationRecord[];
  hasEvidenceMissing: boolean;
  missingEvidenceTypes: string[];
  hasSalesSupplement: boolean;
  hasInvoiceReversed: boolean;
  status: MilestoneStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportOptions {
  includeHistory: boolean;
  includeEvidence: boolean;
  includeDiscrepancies: boolean;
  format: 'xlsx' | 'csv' | 'pdf';
}

export interface FilterOptions {
  contractNo?: string;
  licensee?: string;
  status?: MilestoneStatus[];
  recordType?: RecordType[];
  hasEvidenceMissing?: boolean;
  hasSalesSupplement?: boolean;
  hasInvoiceReversed?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}
