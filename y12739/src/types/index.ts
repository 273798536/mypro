export type StudentLevel = 'A' | 'B' | 'C' | 'D';

export interface Student {
  id: string;
  name: string;
  level: StudentLevel;
  grade: number;
}

export type QuestionType = 'single' | 'multiple' | 'fill' | 'calculate';

export interface KnowledgePoint {
  id: string;
  name: string;
  chapter: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface WrongQuestion {
  id: string;
  studentId: string;
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  knowledgePointIds: string[];
  studentAnswer: string;
  correctAnswer: string;
  wrongReason: string;
  attemptCount: number;
  firstWrongAt: string;
  lastAttemptAt: string;
  draftImageUrl?: string;
  isCalculationError: boolean;
}

export type DPStateValue = 0 | 0.25 | 0.5 | 0.75 | 1;

export interface DPState {
  knowledgePointId: string;
  knowledgePointName: string;
  value: DPStateValue;
  label: string;
  lastUpdated: string;
  sourceQuestionIds: string[];
}

export interface DPTransition {
  id: string;
  fromState: DPStateValue;
  toState: DPStateValue;
  knowledgePointId: string;
  triggeredByQuestionId?: string;
  probability: number;
  transitionType: 'improve' | 'decline' | 'stable';
  description: string;
  timestamp: string;
  scoringRecordId?: string;
}

export interface DPTransitionTable {
  id: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  states: DPState[];
  transitions: DPTransition[];
  version: number;
}

export type ScoringStatus = 'pending' | 'scored' | 'late' | 'conflicted';

export interface ScoringRecord {
  id: string;
  questionId: string;
  studentId: string;
  score: number;
  fullScore: number;
  graderId: string;
  graderName: string;
  gradedAt: string;
  expectedAt: string;
  status: ScoringStatus;
  comment: string;
  previousScore?: number;
  isLate: boolean;
  lateDays?: number;
}

export type ConstraintType = 'range' | 'dependency' | 'threshold' | 'extrapolation';

export interface ConstraintRule {
  id: string;
  name: string;
  type: ConstraintType;
  description: string;
  knowledgePointId?: string;
  params: Record<string, number | string>;
  enabled: boolean;
  createdAt: string;
}

export interface ConstraintViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  detail: string;
  affectedStateIds?: string[];
  affectedTransitionIds?: string[];
  suggestedAction: string;
}

export interface ConstraintValidationResult {
  isValid: boolean;
  checkedAt: string;
  violations: ConstraintViolation[];
  totalRules: number;
  passedRules: number;
}

export type ConclusionStatus = 'valid' | 'invalid' | 'suspicious' | 'stale';

export interface Conclusion {
  id: string;
  title: string;
  content: string;
  generatedAt: string;
  basedOnTransitionIds: string[];
  basedOnScoringRecordIds: string[];
  status: ConclusionStatus;
  invalidReason?: string;
  affectedByLateScoring?: string[];
}

export type ExtrapolationDirection = 'forward' | 'backward';

export interface ExtrapolationRequest {
  knowledgePointId: string;
  targetSteps: number;
  direction: ExtrapolationDirection;
}

export interface ExtrapolationResult {
  request: ExtrapolationRequest;
  success: boolean;
  blockedReason?: string;
  blockedByRuleId?: string;
  projectedStates?: DPState[];
  projectedTransitions?: DPTransition[];
  boundaryExceeded: boolean;
  maxAllowedSteps: number;
  actualSteps: number;
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  student: Student;
  wrongQuestions: WrongQuestion[];
  knowledgePoints: KnowledgePoint[];
  scoringRecords: ScoringRecord[];
  constraintRules: ConstraintRule[];
  expectedConclusions: string[];
}
