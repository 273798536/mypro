import { BaseEntity, ImportSource } from './common';

export type SampleFlowStatus = 
  | 'draft' 
  | 'submitted' 
  | 'pattern_making' 
  | 'cutting' 
  | 'sewing' 
  | 'ironing' 
  | 'qc' 
  | 'completed' 
  | 'rejected';

export type SampleType = 
  | 'first_sample' 
  | 'fit_sample' 
  | 'size_set_sample' 
  | 'pre_production_sample' 
  | 'production_sample' 
  | 'sales_sample';

export interface SampleFlowRecord extends BaseEntity {
  sampleNo: string;
  styleNo: string;
  styleName?: string;
  brand?: string;
  season?: string;
  sampleType?: SampleType;
  status: SampleFlowStatus;
  
  depositAmount: number;
  depositCurrency: string;
  depositPaidAt?: string;
  depositRefundedAt?: string;
  depositRefundAmount?: number;
  
  assignedTo?: string;
  patternMaker?: string;
  cutter?: string;
  sewer?: string;
  
  receivedAt?: string;
  sentAt?: string;
  completedAt?: string;
  
  importSource: ImportSource;
  sourceRowNumber: number;
  version: number;
  isLatest: boolean;
}

export interface SampleVersion {
  sampleNo: string;
  version: number;
  changedAt: string;
  changedBy: string;
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
}
