export interface Student {
  id: string;
  name: string;
  phone: string;
  courseType: string;
  teacher: string;
  enrollDate: string;
  avatar?: string;
}

export interface FreezeRecord {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  operator: string;
}

export interface CoursePackage {
  id: string;
  studentId: string;
  packageName: string;
  totalHours: number;
  remainingHours: number;
  purchaseDate: string;
  expireDate: string;
  status: 'active' | 'frozen' | 'expired';
  freezeRecords?: FreezeRecord[];
}

export interface MakeUpClass {
  id: string;
  scheduledDate: string;
  teacher: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface LeaveRecord {
  id: string;
  studentId: string;
  leaveDate: string;
  reason: string;
  hours: number;
  status: 'pending' | 'approved' | 'rejected';
  makeUpClass?: MakeUpClass;
}

export interface Evaluation {
  id: string;
  studentId: string;
  evalDate: string | null;
  type: 'monthly' | 'quarterly' | 'final';
  score?: number;
  comment?: string;
  status: 'completed' | 'pending' | 'missing';
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProcessStatus = 'pending' | 'processing' | 'completed';

export interface RenewalAlert {
  id: string;
  studentId: string;
  student: Student;
  renewalProbability: number;
  riskLevel: RiskLevel;
  remainingHours: number;
  nextEvalDate: string | null;
  lastEvalDate: string | null;
  hasConflict: boolean;
  conflictDetails?: string;
  processStatus: ProcessStatus;
  handler?: string;
  updateTime: string;
}

export type TimelineEventType = 'evaluation' | 'leave' | 'makeup' | 'freeze' | 'package' | 'renewal';
export type TimelineEventStatus = 'normal' | 'warning' | 'danger' | 'info';

export interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  status: TimelineEventStatus;
}

export interface OperationLog {
  id: string;
  operator: string;
  operateTime: string;
  action: string;
  targetId: string;
  targetType: string;
  beforeData?: any;
  afterData?: any;
  ip: string;
}

export interface AlertFilters {
  riskLevel?: RiskLevel;
  courseType?: string;
  processStatus?: ProcessStatus;
  hasConflict?: boolean;
  keyword?: string;
}

export interface ExportConfig {
  fields: string[];
  dateRange: [string, string] | null;
  includeConflicts: boolean;
  fileFormat: 'xlsx' | 'csv';
}
