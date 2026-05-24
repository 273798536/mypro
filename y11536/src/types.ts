export type SourceType = 'registration' | 'qrcode' | 'homework' | 'external_receipt';

export type AttendanceStatus = 
  | 'pending'
  | 'confirmed'
  | 'duplicate'
  | 'withdrawn'
  | 'resubmitted'
  | 'failed'
  | 'manually_corrected'
  | 'frozen'
  | 'proxy_sign'
  | 'makeup_sign';

export type CheckIssueType =
  | 'duplicate_tracking_number'
  | 'duplicate_employee'
  | 'proxy_sign_suspected'
  | 'makeup_sign_detected'
  | 'status_mismatch'
  | 'missing_data'
  | 'withdrawn_resubmitted';

export interface SourceEvidence {
  sourceFile: string;
  sourceType: SourceType;
  originalLineNumber: number;
  rawData: Record<string, string>;
  parsedData: {
    employeeId: string;
    employeeName: string;
    trackingNumber: string;
    courseId: string;
    courseName: string;
    attendDate: string;
    signTime?: string;
  };
  importedAt: string;
  importBatchId: string;
}

export interface StatusHistory {
  id: string;
  recordId: string;
  fromStatus: AttendanceStatus | null;
  toStatus: AttendanceStatus;
  operator: string;
  reason: string;
  timestamp: string;
}

export interface CheckIssue {
  id: string;
  recordId: string;
  type: CheckIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  relatedRecordIds?: string[];
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  trackingNumber: string;
  courseId: string;
  courseName: string;
  attendDate: string;
  currentStatus: AttendanceStatus;
  sources: SourceEvidence[];
  issues: CheckIssue[];
  history: StatusHistory[];
  isFrozen: boolean;
  frozenBy?: string;
  frozenAt?: string;
  frozenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  batchId: string;
  total: number;
  success: number;
  failed: number;
  failures: Array<{
    lineNumber: number;
    rawData: Record<string, string>;
    error: string;
  }>;
  importedAt: string;
  sourceFile: string;
  sourceType: SourceType;
}

export interface CheckResult {
  checkedAt: string;
  totalRecords: number;
  totalIssues: number;
  issuesByType: Record<CheckIssueType, number>;
  criticalIssues: number;
  newIssues: CheckIssue[];
}

export interface ReportData {
  generatedAt: string;
  totalRecords: number;
  statusBreakdown: Record<AttendanceStatus, number>;
  sourceBreakdown: Record<SourceType, number>;
  unresolvedIssues: number;
  frozenRecords: number;
  duplicateTrackingNumbers: string[];
  failedImports: Array<{
    sourceFile: string;
    lineNumber: number;
    error: string;
  }>;
}
