export type ErrorType = 'missing_condition' | 'wrong_lemma' | 'counterexample_not_excluded';

export interface StepScore {
  stepId: string;
  stepNumber: number;
  content: string;
  usedConditionIds: string[];
  usedLemmaId: string;
  maxPoints: number;
  earnedPoints: number;
  deductionReason?: string;
  errorType?: ErrorType;
  ownerGuide?: string;
}

export interface ScoreResult {
  attemptId: string;
  levelId: string;
  totalPoints: number;
  maxPoints: number;
  stepScores: StepScore[];
  missingConditions: string[];
  wrongLemmas: string[];
  unexcludedCounterexamples: string[];
  completedAt: Date;
}
