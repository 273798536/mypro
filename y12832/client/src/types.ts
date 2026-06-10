export type SampleStatus = 'imported' | 'reviewing' | 'reviewed' | 'processing' | 'completed' | 'exported';
export type QualityStatus = 'pass' | 'warning' | 'fail';
export type RecordType = 'quality_check' | 'difference_analysis' | 'exception_review' | 'status_update' | 'timepoint_fix' | 'duplicate_handle';
export type RecordResult = 'pending' | 'pass' | 'fail' | 'warning' | 'fixed';
export type AuditAction = 'sample_import' | 'sample_update' | 'status_change' | 'review_submit' | 'timepoint_fix' | 'duplicate_handle' | 'record_create' | 'record_update' | 'report_export';

export interface Sample {
  id: number;
  barcode: string;
  sampleName: string;
  bacteriaName: string;
  resistanceProfile?: string;
  collectionTime?: string;
  testTime?: string;
  sequencingBatch?: string;
  status: SampleStatus;
  qualityStatus: QualityStatus;
  qualityNotes?: string;
  notes?: string;
  hasDuplicateBarcode: boolean;
  hasMissingTimePoint: boolean;
  processingRecords: ProcessingRecord[];
  createdAt: string;
  updatedAt: string;
  importedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ProcessingRecord {
  id: number;
  sampleId: number;
  recordType: RecordType;
  description?: string;
  analysisData?: string;
  differenceDetails?: string;
  exceptionDetails?: string;
  result: RecordResult;
  handlingOpinion?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isReviewed: boolean;
  createdAt: string;
  createdBy: string;
  sample?: Sample;
}

export interface AuditLog {
  id: number;
  sampleId: number;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  operator: string;
  timestamp: string;
  extraInfo?: string;
}

export interface ReportData {
  sample: Sample;
  records: ProcessingRecord[];
  qualityReport: string;
  duplicateExplanation: string;
  timePointExplanation: string;
  traceabilityInfo: string;
}

export interface TraceData {
  record: ProcessingRecord;
  sample: Sample;
  relatedRecords: ProcessingRecord[];
  auditLogs: AuditLog[];
}
