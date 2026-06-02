export type DataSourceType = 'import' | 'manual' | 'system';

export interface DataSource {
  type: DataSourceType;
  filename?: string;
  importTimestamp?: string;
  manualEditTimestamp?: string;
  rowIndex?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  source?: DataSource;
}

export interface Volunteer {
  id: string;
  name: string;
  skillIds: string[];
  leaveSlots: string[];
  source?: DataSource;
}

export interface Position {
  id: string;
  name: string;
  requiredSkillIds: string[];
  headcount: number;
  source?: DataSource;
}

export interface Shift {
  id: string;
  positionId: string;
  timeSlot: string;
  requiredCount: number;
  source?: DataSource;
}

export interface LeaveRecord {
  id: string;
  volunteerId: string;
  timeSlot: string;
  reason: string;
  source?: DataSource;
}

export interface Assignment {
  id: string;
  volunteerId: string;
  shiftId: string;
  constraintExplanation: string;
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
}

export type AnomalyType = 'vacancy' | 'skill_mismatch' | 'shift_conflict' | 'leave_conflict';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  description: string;
  volunteerId: string | null;
  shiftId: string | null;
}

export interface Correction {
  id: string;
  volunteerId: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface ConstraintNode {
  label: string;
  detail: string;
  children: ConstraintNode[];
}

export type AlgorithmMode = 'max_flow' | 'min_cost_max_flow';

export interface FilterState {
  skillIds: string[];
  timeSlot: string | null;
  anomalyTypes: AnomalyType[];
  searchQuery: string;
}

export interface AssignmentResult {
  assignments: Assignment[];
  anomalies: Anomaly[];
  constraintMap: Record<string, ConstraintNode>;
  stats: {
    totalVolunteers: number;
    assignedVolunteers: number;
    totalShifts: number;
    filledShifts: number;
    anomalyCount: number;
    vacancyCount: number;
    mismatchCount: number;
    conflictCount: number;
  };
}

export interface ImportLog {
  id: string;
  filename: string;
  importType: 'volunteers' | 'skills' | 'leave' | 'positions' | 'shifts';
  timestamp: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface TraceItem {
  volunteerName: string;
  skills: string;
  positions: string[];
  shiftCount: number;
  anomalyTypes: string[];
  anomalyCount: number;
  sourceType: string;
  sourceDetail: string;
}
