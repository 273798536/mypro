export interface Student {
  id: string;
  name: string;
  grade: string;
  instrument: string;
  joinDate: string;
  avatar?: string;
}

export interface SkillDimension {
  key: string;
  name: string;
  previousScore: number;
  currentScore: number;
  maxScore: number;
  note: string;
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  periodStart: string;
  periodEnd: string;
  overallChange: number;
  dimensions: SkillDimension[];
  highlights: string[];
  suggestions: string[];
  teacherComment: string;
  createdAt: string;
}

export type PerformanceStatus = 'scheduled' | 'completed' | 'cancelled';
export type BoothType = 'food' | 'merchandise' | 'experience' | 'sponsor';

export interface Track {
  id: string;
  name: string;
  studentIds: string[];
  teacherId: string;
  durationMinutes: number;
  scheduledTime: string;
  stage: string;
  status: PerformanceStatus;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  genre: string;
  notes?: string;
}

export interface Booth {
  id: string;
  name: string;
  type: BoothType;
  operator: string;
  location: string;
  contactPhone: string;
  boothFee: number;
  revenueTarget: number;
}

export type SettlementStatus = 'pending' | 'aligned' | 'exception' | 'manual_review' | 'confirmed';
export type ExceptionType = 'revenue_mismatch' | 'missing_evidence' | 'student_count_mismatch' | 'fee_calculation_error' | 'manual_adjustment' | 'data_incomplete';

export interface BoothSettlement {
  id: string;
  festivalId: string;
  trackId: string;
  boothId: string;
  actualRevenue: number;
  systemCalculatedShare: number;
  actualShare: number;
  studentShare: number;
  teacherShare: number;
  boothShare: number;
  platformShare: number;
  status: SettlementStatus;
  settlementDate: string;
  operatorName: string;
}

export interface ExceptionQueueItem {
  id: string;
  festivalId: string;
  settlementId: string;
  type: ExceptionType;
  humanReason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'pending_evidence';
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  evidenceRequired?: string[];
  evidenceProvided?: string[];
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  nextStep: string;
  needsManualConfirm: boolean;
  isManualOverride: boolean;
  filterSnapshot: Record<string, any>;
}

export interface Festival {
  id: string;
  name: string;
  date: string;
  venue: string;
  organizer: string;
  authorizationExpiry: string;
  status: 'draft' | 'active' | 'settling' | 'completed' | 'expired';
  totalRevenue: number;
  settledAmount: number;
  pendingAmount: number;
}

export interface AuthInfo {
  festivalId: string;
  authorizedUntil: string;
  remainingDays: number;
  isExpired: boolean;
  features: string[];
}

export interface ManualConfirmRecord {
  id: string;
  exceptionId: string;
  confirmer: string;
  confirmedAt: string;
  decision: 'approve' | 'reject' | 'request_more_info';
  reason: string;
  comment: string;
}

export type ProcessStatus = 'not_started' | 'processing' | 'completed' | 'needs_attention';

export interface SchedulerViewItem {
  id: string;
  festivalId: string;
  festivalName: string;
  processedCount: number;
  totalCount: number;
  pendingEvidenceCount: number;
  exceptionCount: number;
  status: ProcessStatus;
  lastRunAt?: string;
}

export interface ExportConfig {
  includeFilters: boolean;
  includeExceptions: boolean;
  includeProgress: boolean;
  format: 'xlsx';
  timestamp: string;
}
