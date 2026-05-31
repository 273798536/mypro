export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'teacher' | 'consultant';
  name: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  courseType: string;
  teacherId: string;
  teacherName?: string;
  remainingLessons: number;
  totalLessons: number;
  renewalDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  latestScore?: WarningScore;
}

export type AttendanceStatus = 'attended' | 'absent' | 'late' | 'makeup';
export type AbsentReason = 'sick' | 'leave' | 'tired' | 'other' | null;

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  lessonDate: string;
  status: AttendanceStatus;
  absentReason: AbsentReason;
  makeupRecordId?: string;
  notes?: string;
  rawData?: Record<string, any>;
  hasMissingFields: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeRecord {
  id: string;
  studentId: string;
  practiceDate: string;
  submittedDate: string;
  durationMinutes: number;
  completionRate: number;
  teacherComment?: string;
  isLate: boolean;
  createdAt: string;
}

export interface FeedbackRecord {
  id: string;
  studentId: string;
  feedbackDate: string;
  content: string;
  sentimentScore: number;
  isDuplicate: boolean;
  duplicateOfId?: string;
  createdAt: string;
}

export type WarningLevel = 'red' | 'yellow' | 'green';
export type VersionTrigger = 'auto' | 'manual' | 'makeup' | 'correction';

export interface WarningVersion {
  id: string;
  version: string;
  createdAt: string;
  dataStartDate: string;
  dataEndDate: string;
  studentCount: number;
  trigger: VersionTrigger;
  description: string;
}

export interface ScoreDimensions {
  absence: number;
  practice: number;
  feedback: number;
  lessonProgress: number;
}

export interface ScoreChange {
  scoreDiff: number;
  reasons: string[];
}

export interface WarningScore {
  id: string;
  studentId: string;
  studentName?: string;
  versionId: string;
  version?: string;
  overallScore: number;
  level: WarningLevel;
  dimensions: ScoreDimensions;
  attribution: string[];
  changeFromPrev?: ScoreChange;
  createdAt: string;
}

export interface ManualCorrection {
  id: string;
  studentId: string;
  studentName?: string;
  versionId: string;
  version?: string;
  originalScore: number;
  correctedScore: number;
  originalLevel: WarningLevel;
  correctedLevel: WarningLevel;
  reason: string;
  correctedBy: string;
  correctedByName?: string;
  renewalResult?: 'renewed' | 'not_renewed' | 'pending';
  createdAt: string;
}

export type FollowUpMethod = 'phone' | 'wechat' | 'in_person' | 'other';

export interface FollowUpRecord {
  id: string;
  studentId: string;
  studentName?: string;
  followUpDate: string;
  followUpBy: string;
  followUpByName?: string;
  method: FollowUpMethod;
  content: string;
  nextAction?: string;
  parentResponse?: string;
  createdAt: string;
}

export interface MakeupRequest {
  attendanceId: string;
  absentReason: Exclude<AbsentReason, null>;
  makeupDate?: string;
  parentCommunication: string;
  notes?: string;
}

export interface MakeupResponse {
  record: AttendanceRecord;
  newScore: WarningScore;
  conclusion: string;
  actionItems: string[];
}

export interface CreateCorrectionRequest {
  studentId: string;
  versionId: string;
  correctedScore: number;
  correctedLevel: WarningLevel;
  reason: string;
  adjustAttribution?: string[];
}

export interface GroupStats {
  groupKey: string;
  groupName: string;
  studentCount: number;
  warningRate: number;
  redRate: number;
  yellowRate: number;
  greenRate: number;
  absenceRate: number;
  practiceCompletionRate: number;
  avgFeedbackSentiment: number;
  renewalRate?: number;
}

export interface VersionComparison {
  version1: WarningVersion;
  version2: WarningVersion;
  scoreChanges: Array<{
    studentId: string;
    studentName: string;
    scoreV1: number;
    scoreV2: number;
    levelV1: WarningLevel;
    levelV2: WarningLevel;
    diff: number;
    reasons: string[];
  }>;
  levelTransitions: Record<string, number>;
  overallTrend: 'improving' | 'worsening' | 'stable';
}

export interface CorrectionEffectiveness {
  totalCorrections: number;
  correctionAccuracy: number;
  avgScoreAdjustment: number;
  renewalRateAfterCorrection: number;
  commonReasons: Array<{ reason: string; count: number }>;
}

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  sampleData: Record<string, any>[];
  issues: Array<{
    row: number;
    column: string;
    issue: string;
    severity: 'error' | 'warning';
    value?: string;
  }>;
  suggestedMapping: Record<string, string>;
}

export interface ImportConfirm {
  fileName: string;
  mapping: Record<string, string>;
  dataType: 'students' | 'attendance' | 'practice' | 'feedback';
  skipInvalid: boolean;
}

export interface ImportResult {
  totalImported: number;
  totalSkipped: number;
  errors: string[];
  newStudentIds?: string[];
}

export type TimelineEventType = 'attendance' | 'absence' | 'practice' | 'feedback' | 'followup' | 'warning';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description: string;
  isAbnormal: boolean;
  linkedId?: string;
}

export interface DashboardStats {
  totalStudents: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  pendingFollowUps: number;
  pendingMakeups: number;
  trend: Array<{ date: string; red: number; yellow: number; green: number }>;
  topRiskStudents: Array<{
    id: string;
    name: string;
    score: number;
    level: WarningLevel;
    lastFollowUp: string;
    attribution: string[];
  }>;
}
