import type { ParamState, CalculationResult, ReviewStatus } from './params';

export interface ModificationEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  user: string;
  note?: string;
}

export interface CalculationRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  params: ParamState;
  result: CalculationResult;
  modificationHistory: ModificationEntry[];
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface RecordFilter {
  functionSearch: string;
  axisFilter: 'all' | 'x' | 'y' | 'custom';
  statusFilter: 'all' | 'approved' | 'pending' | 'rejected' | 'needs_review';
  volumeRange?: [number, number];
}
