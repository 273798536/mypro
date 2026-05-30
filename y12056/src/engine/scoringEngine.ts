import type { Level, PlacedCard, Connection, ConclusionSlot, LemmaCard, Counterexample } from '../types/game';
import type { StepScore, ScoreResult, ErrorType } from '../types/score';
import { detectCounterexamples, isCounterexampleExcluded } from './counterexampleDetector';

const SCORE_WEIGHTS = {
  CONDITIONS_COMPLETE: 0.4,
  LEMMA_CORRECT: 0.3,
  COUNTEREXAMPLE_EXCLUDED: 0.3,
};

const DEDUCTION_RATES = {
  MISSING_CONDITION: 1.0,
  WRONG_LEMMA: 0.5,
  COUNTEREXAMPLE_NOT_EXCLUDED: 0.3,
};

export function calculateStepScore(
  step: ConclusionSlot,
  placedCards: PlacedCard[],
  connections: Connection[],
  level: Level
): StepScore {
  const placedConditionIds = placedCards
    .filter((card) => card.cardType === 'condition')
    .map((card) => card.cardId);

  const placedLemmaIds = placedCards
    .filter((card) => card.cardType === 'lemma')
    .map((card) => card.cardId);

  const stepConnections = connections.filter(
    (conn) => conn.toId === step.id || conn.fromId === step.id
  );

  const connectedConditionIds = stepConnections
    .filter((conn) => conn.fromType === 'condition' && conn.toId === step.id)
    .map((conn) => conn.fromId);

  const connectedLemmaId = stepConnections.find(
    (conn) => conn.fromType === 'lemma' && conn.toId === step.id
  )?.fromId;

  const requiredConditionIds = step.requiredConditionIds;
  const requiredLemmaId = step.requiredLemmaId;

  let errorType: ErrorType | undefined;
  let deductionReason: string | undefined;
  let earnedPoints = step.points;

  const allConditionsPresent = requiredConditionIds.every((id) =>
    connectedConditionIds.includes(id)
  );

  if (!allConditionsPresent) {
    errorType = 'missing_condition';
    const missingConditions = requiredConditionIds.filter(
      (id) => !connectedConditionIds.includes(id)
    );
    const missingConditionContents = missingConditions
      .map((id) => level.conditionCards.find((c) => c.id === id)?.content)
      .filter(Boolean)
      .join('、');
    deductionReason = `缺失必要条件：${missingConditionContents}`;
    earnedPoints -= Math.floor(step.points * DEDUCTION_RATES.MISSING_CONDITION);
  }

  const lemmaCard = level.lemmaCards.find((l) => l.id === connectedLemmaId);
  const lemmaCorrect = connectedLemmaId === requiredLemmaId && lemmaCard?.isCorrect;

  if (!lemmaCorrect && !errorType) {
    errorType = 'wrong_lemma';
    if (connectedLemmaId && lemmaCard) {
      deductionReason = lemmaCard.commonMistakes || `引理「${lemmaCard.name}」不适用`;
    } else {
      deductionReason = '未选择引理';
    }
    earnedPoints -= Math.floor(step.points * DEDUCTION_RATES.WRONG_LEMMA);
  }

  const stepCounterexample = level.counterexamples.find(
    (ce) => ce.affectedStepIds.includes(step.id)
  );

  if (stepCounterexample && step.hasCounterexample) {
    const counterexampleExcluded = isCounterexampleExcluded(stepCounterexample, placedCards);
    if (!counterexampleExcluded && !errorType) {
      errorType = 'counterexample_not_excluded';
      deductionReason = `反例未排除：${stepCounterexample.content}`;
      earnedPoints -= Math.floor(step.points * DEDUCTION_RATES.COUNTEREXAMPLE_NOT_EXCLUDED);
    }
  }

  earnedPoints = Math.max(0, earnedPoints);

  return {
    stepId: step.id,
    stepNumber: step.stepNumber,
    content: step.content,
    usedConditionIds: connectedConditionIds,
    usedLemmaId: connectedLemmaId || '',
    maxPoints: step.points,
    earnedPoints,
    deductionReason,
    errorType,
    ownerGuide: errorType ? getOwnerGuide(errorType) : undefined,
  };
}

export function calculateTotalScore(stepScores: StepScore[]): { total: number; max: number } {
  const total = stepScores.reduce((sum, step) => sum + step.earnedPoints, 0);
  const max = stepScores.reduce((sum, step) => sum + step.maxPoints, 0);
  return { total, max };
}

export function getOwnerGuide(errorType: ErrorType): string {
  switch (errorType) {
    case 'missing_condition':
      return '【待确认分支】请自查已知条件，确认是否有遗漏';
    case 'wrong_lemma':
      return '【找教练核对】此引理适用条件不符，请与教练讨论';
    case 'counterexample_not_excluded':
      return '【反例预警】请考虑特殊情况，必要时补录反例卡';
    default:
      return '';
  }
}

export function generateScoreResult(
  level: Level,
  placedCards: PlacedCard[],
  connections: Connection[],
  counterexamples: Counterexample[]
): ScoreResult {
  const stepScores = level.conclusionSlots.map((step) =>
    calculateStepScore(step, placedCards, connections, level)
  );

  const { total, max } = calculateTotalScore(stepScores);

  const missingConditions = stepScores
    .filter((s) => s.errorType === 'missing_condition')
    .flatMap((s) => {
      const step = level.conclusionSlots.find((slot) => slot.id === s.stepId);
      if (!step) return [];
      return step.requiredConditionIds.filter((id) => !s.usedConditionIds.includes(id));
    });

  const wrongLemmas = stepScores
    .filter((s) => s.errorType === 'wrong_lemma')
    .map((s) => s.usedLemmaId)
    .filter(Boolean);

  const unexcludedCounterexamples = detectCounterexamples(placedCards, level).map(
    (ce) => ce.id
  );

  return {
    attemptId: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    levelId: level.id,
    totalPoints: total,
    maxPoints: max,
    stepScores,
    missingConditions,
    wrongLemmas,
    unexcludedCounterexamples,
    completedAt: new Date(),
  };
}
