import { BaseEntity, ImportSource } from './common';

export type RefundStatus = 'pending' | 'processing' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export type RefundType = 'deposit' | 'advance' | 'overpayment' | 'other';

export interface RefundRecord extends BaseEntity {
  refundNo: string;
  relatedSampleNo?: string;
  relatedStyleNo?: string;
  relatedContractNo?: string;
  
  type: RefundType;
  status: RefundStatus;
  
  originalAmount: number;
  refundAmount: number;
  currency: string;
  
  applicant: string;
  applicantDepartment: string;
  appliedAt: string;
  
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
  
  paymentMethod?: string;
  paymentReference?: string;
  
  reason: string;
  remarks?: string;
  
  importSource: ImportSource;
  sourceRowNumber: number;
  version: number;
  isLatest: boolean;
}

export interface RefundVersion {
  refundNo: string;
  version: number;
  changedAt: string;
  changedBy: string;
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
}
