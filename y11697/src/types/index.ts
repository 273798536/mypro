export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off';

export interface Doctor {
  id: string;
  name: string;
  departments: string[];
  skills: string[];
  maxWeeklyHours: number;
  preferences?: {
    preferredShifts?: ShiftType[];
    avoidedShifts?: ShiftType[];
  };
  source: string;
}

export interface Department {
  id: string;
  name: string;
  requiredSkills: string[];
  source: string;
}

export interface LeaveRequest {
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  type: 'sick' | 'vacation' | 'personal';
  reason?: string;
  source: string;
}

export interface ShiftRequirement {
  date: string;
  shiftType: ShiftType;
  departmentId: string;
  requiredDoctors: number;
  source: string;
}

export interface FatigueRules {
  maxConsecutiveShifts: number;
  maxConsecutiveNights: number;
  minHoursBetweenShifts: number;
  nightShiftRecoveryDays: number;
  weeklyHourLimit: number;
  source: string;
}

export interface LockedShift {
  doctorId: string;
  date: string;
  shiftType: ShiftType;
  reason?: string;
  lockedBy?: string;
  lockedAt?: string;
  source: string;
}

export interface ScheduleEntry {
  doctorId: string;
  date: string;
  shiftType: ShiftType;
  departmentId: string;
  isLocked: boolean;
  assignedAt?: string;
  source: string;
}

export interface Violation {
  type: 'leave_conflict' | 'department_coverage' | 'consecutive_nights' | 'consecutive_shifts' | 'fatigue_hours' | 'shift_gap' | 'night_recovery';
  severity: 'error' | 'warning';
  doctorId?: string;
  departmentId?: string;
  date?: string;
  shiftType?: ShiftType;
  message: string;
  details: Record<string, unknown>;
  source: string;
}

export interface ScheduleScore {
  totalScore: number;
  coverageScore: number;
  fatigueScore: number;
  preferenceScore: number;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    weight: number;
    items: { description: string; points: number }[];
  }[];
}

export interface Schedule {
  id: string;
  version: number;
  name: string;
  startDate: string;
  endDate: string;
  entries: ScheduleEntry[];
  violations: Violation[];
  score?: ScheduleScore;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  source: string;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  userId?: string;
  changes: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
  source: string;
}

export interface InputData {
  doctors: Doctor[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  shiftRequirements: ShiftRequirement[];
  fatigueRules: FatigueRules;
  lockedShifts: LockedShift[];
  existingSchedule?: Schedule;
}

export interface SolverOptions {
  maxIterations: number;
  tolerance: number;
  prioritizeCoverage: boolean;
  allowSoftViolations: boolean;
}

export interface ScheduleComparison {
  scheduleA: {
    id: string;
    name: string;
    score: ScheduleScore;
    violationCount: { errors: number; warnings: number };
  };
  scheduleB: {
    id: string;
    name: string;
    score: ScheduleScore;
    violationCount: { errors: number; warnings: number };
  };
  differences: {
    date: string;
    shiftType: ShiftType;
    departmentId: string;
    doctorA?: string;
    doctorB?: string;
    changeType: 'added' | 'removed' | 'swapped';
  }[];
}
