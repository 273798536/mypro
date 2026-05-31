export interface ConditionCard {
  id: string;
  content: string;
  source: 'original' | 'derived';
  category: 'given' | 'lemma' | 'conclusion';
  isOnCanvas: boolean;
  position: { x: number; y: number };
}

export interface CounterExample {
  id: string;
  content: string;
  source: 'imported' | 'discovered';
  status: 'pending' | 'excluded' | 'unexcluded';
  relatedConditionId: string | null;
  description: string;
}

export interface LogicLink {
  id: string;
  fromCardId: string;
  toCardId: string;
  status: 'pending' | 'valid' | 'invalid';
  rule: 'deduction' | 'induction' | 'contradiction';
  stepIndex: number;
}

export interface StepRecord {
  id: string;
  actionType: 'link' | 'exclude' | 'import' | 'judge' | 'place_card' | 'remove_link';
  actionDetail: string;
  timestamp: number;
  scoreDelta: number;
  deductionReason: string | null;
}

export interface DeductionItem {
  stepIndex: number;
  category: 'lemma_misuse' | 'condition_missing' | 'counterexample_unexcluded';
  description: string;
  evidenceRef: string;
  pointsDeducted: number;
}

export interface ScoreResult {
  totalScore: number;
  maxScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  linkScore: number;
  linkMaxScore: number;
  evidenceScore: number;
  evidenceMaxScore: number;
  timeBonus: number;
  deductions: DeductionItem[];
}

export interface JudgeReport {
  id: string;
  sessionId: string;
  caseInfo: {
    title: string;
    theorem: string;
    studentProof: string;
  };
  evidenceSummary: {
    totalConditions: number;
    originalCount: number;
    derivedCount: number;
    counterExamples: {
      excluded: number;
      unexcluded: number;
      pending: number;
    };
  };
  judgmentDetails: Array<{
    from: string;
    to: string;
    status: string;
    rule: string;
  }>;
  deductionBreakdown: DeductionItem[];
  conclusion: string;
  evidenceStandards: string;
  generatedAt: number;
}

export interface ImportPayload {
  type: 'conditions' | 'counterExamples' | 'timer';
  metadata: {
    source: string;
    importedAt: number;
  };
  raw: unknown;
  processed: unknown;
}

export interface CorrectLink {
  fromCardId: string;
  toCardId: string;
  rule: 'deduction' | 'induction' | 'contradiction';
}

export interface DemoCase {
  theoremTitle: string;
  theoremStatement: string;
  studentProof: string;
  conditions: ConditionCard[];
  counterExamples: CounterExample[];
  correctLinks: CorrectLink[];
  totalTime: number;
}
