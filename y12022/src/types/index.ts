export type CoursePackStatus = 'active' | 'frozen' | 'expired' | 'completed';

export type AttendanceStatus = 'scheduled' | 'checked_in' | 'leave' | 'absent' | 'confirmed';

export type EntityType = 'coursePack' | 'attendance' | 'substitute' | 'leave' | 'freeze' | 'revenue';

export type ActionType = 'create' | 'update' | 'delete' | 'confirm';

export interface CoursePack {
  id: string;
  studentName: string;
  totalHours: number;
  usedHours: number;
  purchaseDate: string;
  expireDate: string;
  status: CoursePackStatus;
  unitPrice: number;
  createdAt: string;
}

export interface Attendance {
  id: string;
  coursePackId: string;
  date: string;
  teacherId: string;
  teacherName: string;
  status: AttendanceStatus;
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  hasSubstitute?: boolean;
  hasLeave?: boolean;
  isMakeup?: boolean;
  originalAttendanceId?: string;
}

export interface SubstituteRecord {
  id: string;
  attendanceId: string;
  originalTeacherId: string;
  originalTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  reason: string;
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  attendanceId: string;
  reason: string;
  makeupDate?: string;
  madeUp: boolean;
  createdAt: string;
}

export interface FreezeRecord {
  id: string;
  coursePackId: string;
  freezeDate: string;
  unfreezeDate?: string;
  reason: string;
}

export interface AuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  source: string;
  operator: string;
  timestamp: string;
}

export interface RevenueRecognition {
  id: string;
  coursePackId: string;
  attendanceId: string;
  amount: number;
  recognizedDate: string;
  period: string;
}

export interface TraceNode {
  id: string;
  type: EntityType;
  title: string;
  description: string;
  timestamp: string;
  operator: string;
  details: Record<string, unknown>;
  children?: TraceNode[];
}

export interface Teacher {
  id: string;
  name: string;
}
