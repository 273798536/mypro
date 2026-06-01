export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface Volunteer {
  id: string;
  name: string;
  skillIds: string[];
  leaveSlots: string[];
}

export interface Position {
  id: string;
  name: string;
  requiredSkillIds: string[];
  headcount: number;
}

export interface Shift {
  id: string;
  positionId: string;
  timeSlot: string;
  requiredCount: number;
}

export interface LeaveRecord {
  id: string;
  volunteerId: string;
  timeSlot: string;
  reason: string;
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
