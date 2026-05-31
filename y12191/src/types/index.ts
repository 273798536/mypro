export type Skill = '检票' | '引导' | '安检' | '票务' | '后台' | '应急';
export type Training = '消防培训' | '应急处理' | '服务礼仪' | '票务系统' | '安检规范';
export type TimeSlot = '18:00-20:00' | '19:00-21:00' | '20:00-22:00' | '全天';

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  skills: Skill[];
  availableSlots: TimeSlot[];
  isOnLeave: boolean;
  leaveReason?: string;
  leaveSlots?: TimeSlot[];
}

export interface Position {
  id: string;
  name: string;
  requiredSkills: Skill[];
  requiredTraining: Training[];
  timeSlot: TimeSlot;
  capacity: number;
  notes?: string;
}

export interface TrainingRecord {
  id: string;
  volunteerId: string;
  trainingName: Training;
  completedAt: string;
  status: 'passed' | 'failed' | 'pending';
  expiresAt?: string;
}

export type AssignmentStatus = 'assigned' | 'backup' | 'rejected' | 'pending';

export interface Assignment {
  id: string;
  volunteerId: string;
  positionId: string;
  timeSlot: TimeSlot;
  status: AssignmentStatus;
  reason?: string;
  isBackup?: boolean;
  backupPriority?: number;
}

export type IssueType = 'conflict' | 'missing_training' | 'leave' | 'capacity' | 'skill' | 'availability' | 'training_expiring';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CheckIssue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  details?: string;
}

export type SampleType = 'normal' | 'boundary' | 'bad';

export interface CheckResult {
  id: string;
  assignment: Assignment;
  volunteer: Volunteer;
  position: Position;
  sampleType: SampleType;
  issues: CheckIssue[];
  checkedAt: string;
}

export type SnapshotPhase = 'phase1' | 'phase2' | 'corrected';

export interface Snapshot {
  id: string;
  timestamp: string;
  createdAt: string;
  phase: SnapshotPhase;
  description: string;
  volunteers: Volunteer[];
  positions: Position[];
  trainingRecords: TrainingRecord[];
  assignments: Assignment[];
  checkResults: CheckResult[];
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}

export interface Notification {
  id: string;
  volunteerId: string;
  volunteerName: string;
  recipientName: string;
  type: 'schedule_change' | 'backup_assigned' | 'training_missing' | 'info';
  title: string;
  content: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isRead: boolean;
  relatedAssignmentId?: string;
  snapshotId?: string;
}

export interface ComparisonResult {
  snapshotBeforeId: string;
  snapshotAfterId: string;
  summary: {
    totalChanges: number;
    newAssignments: number;
    removedAssignments: number;
    statusChanges: number;
    sampleTypeChanges: number;
  };
  differences: ComparisonDiff[];
}

export interface ComparisonDiff {
  assignmentId: string;
  volunteerName: string;
  positionName: string;
  field: string;
  before: unknown;
  after: unknown;
  changeType: 'added' | 'removed' | 'modified';
  impact: 'low' | 'medium' | 'high';
}

export interface BoundaryScenario {
  id: string;
  name: string;
  description: string;
  category: 'conflict' | 'missing_training' | 'leave' | 'capacity' | 'mixed';
  setupData: {
    volunteers: Partial<Volunteer>[];
    positions: Partial<Position>[];
    trainingRecords: Partial<TrainingRecord>[];
  };
  expectedIssues: IssueType[];
  expectedSampleType: SampleType;
}

export type CheckRuleType = 
  | 'conflict' 
  | 'training' 
  | 'leave' 
  | 'skill' 
  | 'capacity' 
  | 'availability'
  | 'training_expiry';

export interface CheckRule {
  id: CheckRuleType;
  name: string;
  description: string;
  enabled: boolean;
  severity: IssueSeverity;
  check: (
    assignment: Assignment,
    volunteer: Volunteer,
    position: Position,
    context: {
      allAssignments: Assignment[];
      trainingRecords: TrainingRecord[];
      allVolunteers: Volunteer[];
      allPositions: Position[];
    }
  ) => CheckIssue | null;
}

export interface StoreState {
  volunteers: Volunteer[];
  positions: Position[];
  trainingRecords: TrainingRecord[];
  assignments: Assignment[];
  checkResults: CheckResult[];
  snapshots: Snapshot[];
  notifications: Notification[];
  currentPhase: 'idle' | 'phase1' | 'phase2' | 'comparing';
  selectedSnapshotIds: [string | null, string | null];
  comparisonResult: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
  
  setVolunteers: (volunteers: Volunteer[]) => void;
  setPositions: (positions: Position[]) => void;
  setTrainingRecords: (records: TrainingRecord[]) => void;
  
  runScheduleCheck: (phase: SnapshotPhase, description?: string) => Promise<Snapshot>;
  runScheduleCheckWithBackup: () => Promise<void>;
  compareSnapshots: (beforeId: string, afterId: string) => ComparisonResult;
  updatePosition: (positionId: string, updates: Partial<Position>) => Promise<Snapshot>;
  manualAssign: (volunteerId: string, positionId: string) => CheckResult | null;
  
  generateBoundaryScenario: (scenarioId: string) => BoundaryScenario;
  runIdempotencyTest: () => { passed: boolean; message: string };
  
  addNotification: (notification: Omit<Notification, 'id' | 'sentAt'>) => void;
  clearError: () => void;
  resetAll: () => void;
}
