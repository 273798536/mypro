export type EmployeeStatus = 'active' | 'terminated' | 'pending';
export type VestingStatus = 'vested' | 'pending' | 'accelerated' | 'forfeited' | 'expired';
export type ExerciseStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type AccelerationType = 'single-trigger' | 'double-trigger' | 'none';
export type VestingFrequency = 'monthly' | 'yearly';

export interface Employee {
  id: string;
  name: string;
  employeeNo: string;
  hireDate: string;
  terminationDate?: string;
  status: EmployeeStatus;
  department: string;
  position: string;
}

export interface VestingPlan {
  id: string;
  name: string;
  version: string;
  totalMonths: number;
  cliffMonths: number;
  vestingFrequency: VestingFrequency;
  hasAcceleration: boolean;
  accelerationType: AccelerationType;
  accelerationNote: string;
  exerciseWindowDays: number;
  description: string;
}

export interface Grant {
  id: string;
  employeeId: string;
  planId: string;
  totalShares: number;
  grantDate: string;
  exerciseStartDate: string;
  exerciseEndDate: string;
  agreementVersion: string;
  status: 'active' | 'cancelled' | 'exercised';
  terminationDate?: string;
}

export interface VestingSchedule {
  id: string;
  grantId: string;
  vestDate: string;
  vestedShares: number;
  cumulativeShares: number;
  status: VestingStatus;
  calculationNote: string;
  isAccelerated: boolean;
  accelerationReason?: string;
  exerciseDeadline?: string;
}

export interface Exercise {
  id: string;
  grantId: string;
  vestingScheduleId: string;
  employeeId: string;
  shares: number;
  applicationDate: string;
  approvalDate?: string;
  status: ExerciseStatus;
  applicant: string;
  approver?: string;
  rejectionReason?: string;
  exercisePrice: number;
  fairMarketValue: number;
}

export interface CorrectionHistory {
  id: string;
  grantId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  timestamp: string;
}

export interface VestingSummary {
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  department: string;
  status: EmployeeStatus;
  totalGranted: number;
  totalVested: number;
  totalPending: number;
  totalForfeited: number;
  totalExercised: number;
  totalAvailable: number;
  hasException: boolean;
  exceptionType?: 'acceleration' | 'expired' | 'correction' | 'forfeiture';
  exceptionNote?: string;
}

export interface VestingDetail {
  employee: Employee;
  grant: Grant;
  plan: VestingPlan;
  schedules: VestingSchedule[];
  exercises: Exercise[];
  corrections: CorrectionHistory[];
}

export interface CorrectionRequest {
  grantId: string;
  fieldName: string;
  newValue: string;
  reason: string;
  operator: string;
}

export interface ExerciseRequest {
  grantId: string;
  vestingScheduleId: string;
  employeeId: string;
  shares: number;
  applicant: string;
  exercisePrice: number;
  fairMarketValue: number;
}

export interface ExerciseApproval {
  status: 'approved' | 'rejected';
  approver: string;
  rejectionReason?: string;
}
