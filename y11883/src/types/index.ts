export interface PartitionConditions {
  maxParts?: number;
  minParts?: number;
  allowDuplicate: boolean;
  maxValue?: number;
  minValue?: number;
  includeNumbers?: number[];
  excludeNumbers?: number[];
}

export interface Partition {
  id: string;
  numbers: number[];
  sum: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  orderIndex: number;
}

export interface RecursionStep {
  depth: number;
  currentSum: number;
  currentNumbers: number[];
  remaining: number;
  action: 'add' | 'backtrack' | 'complete';
}

export interface DedupStep {
  stepIndex: number;
  description: string;
  before: number[][];
  after: number[][];
  removedPartitions: string[];
}

export type WarningType = 'duplicate_miss' | 'condition_unused' | 'explosion';

export interface WarningItem {
  id: string;
  type: WarningType;
  problemId: string;
  message: string;
  details: Record<string, any>;
  confirmed: boolean;
}

export type ErrorType = 'format' | 'invalid_number' | 'condition_conflict';

export interface InputError {
  id: string;
  lineNumber: number;
  rawInput: string;
  errorType: ErrorType;
  message: string;
  suggestion?: string;
}

export interface ProblemInput {
  id: string;
  lineNumber: number;
  targetNumber: number;
  conditions: PartitionConditions;
  studentAnswer: string[];
  rawInput: string;
}

export interface AnswerComparison {
  correctAnswers: string[];
  wrongAnswers: string[];
  missedAnswers: string[];
  duplicateAnswers: string[];
}

export interface ProblemResult {
  problemId: string;
  input: ProblemInput;
  partitions: Partition[];
  rawPartitions: Partition[];
  recursionSteps: RecursionStep[];
  dedupSteps: DedupStep[];
  answerComparison: AnswerComparison;
  warnings: WarningItem[];
  isProcessing: boolean;
}

export interface AppState {
  rawInput: string;
  globalConditions: PartitionConditions;
  problems: ProblemResult[];
  errors: InputError[];
  isGenerating: boolean;
  progress: number;
}

export interface AppActions {
  setRawInput: (input: string) => void;
  setGlobalConditions: (conditions: PartitionConditions) => void;
  generateAll: () => Promise<void>;
  confirmWarning: (warningId: string) => void;
  clearAll: () => void;
}

export type AppStore = AppState & AppActions;
