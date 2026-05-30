import type { Level, PlacedCard, Counterexample, ConclusionSlot } from '../types/game';

export function detectCounterexamples(
  placedCards: PlacedCard[],
  level: Level
): Counterexample[] {
  const placedConditionIds = placedCards
    .filter((card) => card.cardType === 'condition')
    .map((card) => card.cardId);

  return level.counterexamples
    .map((counterexample) => ({
      ...counterexample,
      isExcluded: isCounterexampleExcluded(counterexample, placedCards),
    }))
    .filter((counterexample) => !counterexample.isExcluded);
}

export function isCounterexampleExcluded(
  counterexample: Counterexample,
  placedCards: PlacedCard[]
): boolean {
  if (!counterexample.excludedBy) {
    return false;
  }

  const placedConditionIds = placedCards
    .filter((card) => card.cardType === 'condition')
    .map((card) => card.cardId);

  return placedConditionIds.includes(counterexample.excludedBy);
}

export function getAffectedSteps(
  counterexample: Counterexample,
  level: Level
): ConclusionSlot[] {
  return level.conclusionSlots.filter((slot) =>
    counterexample.affectedStepIds.includes(slot.id)
  );
}
