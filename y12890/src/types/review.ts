import { DataStatus, NextStep, ReviewEntryType, QualityIssue } from './common';

export interface ReviewEntry {
  id: string;
  taskId: string;
  issueId: string;
  type: ReviewEntryType;
  status: DataStatus;
  data: Record<string, unknown>;
  issue?: QualityIssue;
  reviewerNote?: string;
  nextStep: NextStep;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ReviewBatch {
  taskId: string;
  entries: ReviewEntry[];
  riskAlerts: ReviewEntry[];
  waterRecords: ReviewEntry[];
  duplicates: ReviewEntry[];
  createdAt: Date;
}

export interface ConsistencyIssue {
  id: string;
  description: string;
  displayValue: string;
  calculatedValue: string;
  difference: number;
  resolved: boolean;
  resolution?: 'use_display' | 'use_calculated' | null;
}

export interface ConsistencyReport {
  totalChecked: number;
  issues: ConsistencyIssue[];
  isConsistent: boolean;
  explanation: string;
}

export interface ExportOptions {
  includeRawData: boolean;
  includeCalculatedData: boolean;
  includeQualityReport: boolean;
  includeReviewLogs: boolean;
  format: 'csv' | 'excel' | 'pdf';
}
