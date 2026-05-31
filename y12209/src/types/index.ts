export interface ProjectArchive {
  projectId: string;
  projectName: string;
  gridConnectionDate: string;
  installedCapacity: number;
  province: string;
  projectType: string;
  gridCertificateNo: string;
}

export interface SubsidyBatch {
  batchId: string;
  projectId: string;
  batchNo: string;
  declarationDate: string;
  subsidyAmount: number;
  invoiceNo: string;
  invoiceDate: string;
  status: 'pending' | 'processing' | 'paid' | 'delayed' | 'reversed' | 'merged';
  isInvoiceReversed: boolean;
  reverseReason?: string;
  mergedFromBatches?: string[];
}

export interface PaymentReport {
  paymentId: string;
  batchId: string;
  paymentDate: string;
  paymentAmount: number;
  bankSerialNo: string;
  payer: string;
  receiverAccount: string;
}

export type RiskType = 'delay' | 'invoice_reverse' | 'project_merge';

export interface RiskRecord {
  riskId: string;
  batchId: string;
  riskType: RiskType;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  relatedBatches?: string[];
}

export type MatchStatus = 'unmatched' | 'matched' | 'confirmed' | 'exception';

export interface MatchRecord {
  recordId: string;
  batchId: string;
  projectId: string;
  paymentId: string;
  matchStatus: MatchStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
  risks: RiskRecord[];
  project: ProjectArchive;
  batch: SubsidyBatch;
  payment: PaymentReport;
}

export interface FilterConditions {
  projectName: string;
  batchNo: string;
  matchStatus: string;
  riskType: string;
  dateRange: [string, string] | null;
}
