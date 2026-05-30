import type { CardType, ConditionCard, LemmaCard, ConclusionSlot, Level } from '../types/game';
import type { ErrorType } from '../types/score';

interface ValidateConnectionResult {
  isCorrect: boolean;
  errorType?: ErrorType;
  message?: string;
}

const VALID_TRANSITIONS: Array<[CardType, CardType]> = [
  ['condition', 'lemma'],
  ['condition', 'conclusion'],
  ['lemma', 'conclusion'],
];

export function validateConnection(
  fromCard: ConditionCard | LemmaCard,
  toCard: LemmaCard | ConclusionSlot,
  levelData: Level
): ValidateConnectionResult {
  const fromType = fromCard.type;
  const toType = 'stepNumber' in toCard ? 'conclusion' : toCard.type;

  const isValidTransition = VALID_TRANSITIONS.some(
    ([from, to]) => from === fromType && to === toType
  );

  if (!isValidTransition) {
    return {
      isCorrect: false,
      message: `不支持 ${fromType} → ${toType} 的连线类型`,
    };
  }

  if (fromType === 'condition' && toType === 'lemma') {
    const lemma = toCard as LemmaCard;
    const condition = fromCard as ConditionCard;
    
    if (!lemma.applicableConditions.includes(condition.id)) {
      return {
        isCorrect: false,
        errorType: 'missing_condition',
        message: `条件「${condition.content}」不适用于引理「${lemma.name}」`,
      };
    }
  }

  if (fromType === 'condition' && toType === 'conclusion') {
    const conclusion = toCard as ConclusionSlot;
    const condition = fromCard as ConditionCard;
    
    if (!conclusion.requiredConditionIds.includes(condition.id)) {
      return {
        isCorrect: false,
        errorType: 'missing_condition',
        message: `条件「${condition.content}」不是结论「${conclusion.content}」的必要条件`,
      };
    }
  }

  if (fromType === 'lemma' && toType === 'conclusion') {
    const conclusion = toCard as ConclusionSlot;
    const lemma = fromCard as LemmaCard;
    
    if (conclusion.requiredLemmaId !== lemma.id) {
      return {
        isCorrect: false,
        errorType: 'wrong_lemma',
        message: `引理「${lemma.name}」不适用于结论「${conclusion.content}」`,
      };
    }
    
    if (!lemma.isCorrect) {
      return {
        isCorrect: false,
        errorType: 'wrong_lemma',
        message: `引理「${lemma.name}」是错误的引理`,
      };
    }
  }

  return {
    isCorrect: true,
  };
}

export function getConnectionColor(isCorrect: boolean, errorType?: ErrorType): string {
  if (isCorrect) {
    return '#22c55e';
  }
  
  switch (errorType) {
    case 'missing_condition':
      return '#f59e0b';
    case 'wrong_lemma':
      return '#ef4444';
    case 'counterexample_not_excluded':
      return '#8b5cf6';
    default:
      return '#ef4444';
  }
}

export function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
