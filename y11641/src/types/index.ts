export interface PrescriptionItem {
  id: string;
  lineNumber: number;
  drugName: string;
  drugCode: string;
  dosage: string;
  dosageValue: number;
  dosageUnit: string;
  frequency: string;
  route: string;
}

export interface BatchNumber {
  id: string;
  number: string;
  productionDate: string;
  expiryDate: string;
  isExpired: boolean;
}

export interface DrugInfo {
  id: string;
  name: string;
  code: string;
  specifications: string;
  unit: string;
  unitConversions?: { from: string; to: string; factor: number }[];
  batchNumbers: BatchNumber[];
  contraindications: string[];
  warnings: string[];
  isTrap?: boolean;
  trapType?: 'CONTRAINDICATION' | 'EXPIRED' | 'WRONG_DRUG';
}

export type ErrorType = 
  | 'WRONG_DRUG'
  | 'UNIT_MISMATCH'
  | 'CONTRAINDICATION'
  | 'BATCH_EXPIRED'
  | 'BATCH_WRONG'
  | 'CALCULATION_ERROR';

export interface PlayerAction {
  step: number;
  timestamp: number;
  type: 'drug_select' | 'unit_confirm' | 'contra_check' | 'batch_confirm';
  selectedId: string;
  isCorrect: boolean;
  correctionMade: boolean;
  originalSelection?: string;
  pointsDelta: number;
  errorType?: ErrorType;
  errorDetail?: string;
  sourceLine?: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number;
  patientInfo: {
    name: string;
    age: number;
    gender: string;
    conditions: string[];
    allergies: string[];
  };
  prescriptions: PrescriptionItem[];
  availableDrugs: DrugInfo[];
  targetScore: number;
}

export interface GameSession {
  id: string;
  levelId: string;
  startTime: number;
  endTime?: number;
  actions: PlayerAction[];
  totalScore: number;
  maxScore: number;
  errors: PlayerAction[];
  status: 'playing' | 'completed' | 'timeout';
  currentStep: number;
  selectedDrugId?: string;
  confirmedUnit?: string;
  checkedContraindications: string[];
  selectedBatchId?: string;
}

export interface ScoreItem {
  step: number;
  description: string;
  basePoints: number;
  deductions: number;
  netPoints: number;
  sourceLine?: number;
}

export interface ErrorSummaryItem {
  errorType: ErrorType;
  count: number;
  instances: Array<{
    step: number;
    sourceLine: number;
    detail: string;
    correction: string;
  }>;
}

export interface CorrectionTrail {
  step: number;
  sourceLine: number;
  originalValue: string;
  correctedValue: string;
  reason: string;
  timestamp: number;
}

export interface GameReport {
  session: GameSession;
  scoreBreakdown: ScoreItem[];
  errorSummary: ErrorSummaryItem[];
  correctionTrail: CorrectionTrail[];
}

export interface HistoryRecord {
  id: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime?: number;
  totalScore: number;
  maxScore: number;
  errorCount: number;
  status: 'completed' | 'timeout';
  actions: PlayerAction[];
  errors: PlayerAction[];
}

export interface GameState {
  currentSession: GameSession | null;
  history: HistoryRecord[];
  levels: LevelConfig[];
  unlockedLevels: string[];
  highScores: Record<string, number>;
}
