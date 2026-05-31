export type DecisionType = 'release' | 'detain' | 'transfer';

export type EvidenceType = 
  | 'version_change' 
  | 'yard_update' 
  | 'shift_overtime' 
  | 'gate_conflict' 
  | 'appointment_overdue';

export type ConflictType = 
  | 'remark_mismatch' 
  | 'yard_version_mismatch' 
  | 'shift_overtime' 
  | 'appointment_overdue' 
  | 'wrong_queue_order';

export interface TruckVersion {
  id: string;
  version: number;
  remark: string;
  timestamp: Date;
  operator: string;
}

export interface ShiftRecord {
  id: string;
  shiftType: string;
  startTime: Date;
  endTime: Date;
  isOvertime: boolean;
  overtimeMinutes?: number;
}

export interface Truck {
  id: string;
  plateNumber: string;
  driverName: string;
  appointmentNo: string;
  appointmentTime: Date;
  currentRemark: string;
  currentVersion: number;
  versionHistory: TruckVersion[];
  shiftRecord: ShiftRecord;
  expectedDecision: DecisionType;
}

export interface GateDecision {
  id: string;
  truckId: string;
  decisionType: DecisionType;
  gateNo: string;
  timestamp: Date;
  operator: string;
  conclusion: string;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  description: string;
  evidenceRef: string;
  truckId: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  content: string;
  timestamp: Date;
  reference: string;
  truckId?: string;
}

export interface GameStep {
  id: string;
  stepNo: number;
  actionType: 'decision' | 'event';
  truckId?: string;
  decision?: DecisionType;
  isValid: boolean;
  conflicts: Conflict[];
  stateSnapshot: {
    trucks: Truck[];
    yardVersion: number;
  };
}

export interface GameSession {
  id: string;
  levelId: string;
  levelName: string;
  score: number;
  totalSteps: number;
  conflictCount: number;
  startTime: Date;
  endTime: Date;
  decisions: GateDecision[];
  evidences: Evidence[];
  steps: GameStep[];
  yardVersionHistory: { version: number; timestamp: Date }[];
}

export interface LevelEvent {
  triggerStep: number;
  type: 'remark_change' | 'yard_update' | 'shift_overtime' | 'appointment_overdue';
  truckId?: string;
  data: Record<string, unknown>;
  message: string;
}

export interface Level {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  description: string;
  initialTrucks: Truck[];
  events: LevelEvent[];
  passScore: number;
  yardVersion: number;
}

export interface RuleViolation {
  ruleId: string;
  description: string;
  severity: 'warning' | 'error';
  evidence: string;
}

export interface RuleFeedback {
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  ruleId?: string;
}

export interface GameResult {
  score: number;
  maxScore: number;
  passed: boolean;
  conflicts: Conflict[];
  correctDecisions: number;
  totalDecisions: number;
}
