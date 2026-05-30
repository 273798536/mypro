export type CardType = 'condition' | 'lemma' | 'conclusion';

export interface ConditionCard {
  id: string;
  type: 'condition';
  content: string;
  latex?: string;
  isUsed: boolean;
  isRequired: boolean;
  order: number;
}

export interface LemmaCard {
  id: string;
  type: 'lemma';
  name: string;
  description: string;
  isCorrect: boolean;
  applicableConditions: string[];
  commonMistakes?: string;
}

export interface ConclusionSlot {
  id: string;
  stepNumber: number;
  content: string;
  requiredConditionIds: string[];
  requiredLemmaId: string;
  points: number;
  hasCounterexample: boolean;
  counterexampleId?: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  fromType: CardType;
  toType: CardType;
  isCorrect: boolean;
  color: string;
}

export interface Counterexample {
  id: string;
  content: string;
  affectedStepIds: string[];
  isExcluded: boolean;
  excludedBy?: string;
}

export interface PlacedCard {
  slotId: string;
  cardId: string;
  cardType: CardType;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  knownConditions: string[];
  toProve: string;
  conditionCards: ConditionCard[];
  lemmaCards: LemmaCard[];
  conclusionSlots: ConclusionSlot[];
  counterexamples: Counterexample[];
}

export interface GameState {
  currentLevelId: string;
  conditionCards: ConditionCard[];
  lemmaCards: LemmaCard[];
  conclusionSlots: ConclusionSlot[];
  connections: Connection[];
  placedCards: PlacedCard[];
  counterexamples: Counterexample[];
  isSubmitted: boolean;
}
