import type { ErrorType } from '@/types';
import { SCORE_CONFIG } from '@/data/gameConfig';

export function calculateScore(
  errors: ErrorType[],
  combo: number
): { scoreChange: number; newCombo: number } {
  let scoreChange = 0;
  let newCombo = combo;

  const hasClassificationError = errors.includes('classification');
  const hasSecurityLevelError = errors.includes('security_level');
  const hasRetentionPeriodError = errors.includes('retention_period');
  const hasBorrowError = errors.includes('borrow_not_registered');

  if (errors.length === 0) {
    scoreChange += SCORE_CONFIG.correctClassification;
    scoreChange += SCORE_CONFIG.correctSecurityLevel;
    scoreChange += SCORE_CONFIG.correctRetentionPeriod;
    scoreChange += SCORE_CONFIG.correctBorrowRegistration;
    
    newCombo = combo + 1;
    const comboBonus = Math.min(newCombo * SCORE_CONFIG.comboBonusPerLevel, SCORE_CONFIG.maxComboBonus);
    scoreChange += comboBonus;
  } else {
    if (hasClassificationError) {
      scoreChange += SCORE_CONFIG.wrongClassification;
    }
    if (hasSecurityLevelError) {
      scoreChange += SCORE_CONFIG.wrongSecurityLevel;
    }
    if (hasRetentionPeriodError) {
      scoreChange += SCORE_CONFIG.wrongRetentionPeriod;
    }
    if (hasBorrowError) {
      scoreChange += SCORE_CONFIG.borrowNotRegistered;
    }
    
    newCombo = 0;
  }

  return { scoreChange, newCombo };
}

export function calculateComboBonus(combo: number): number {
  return Math.min(combo * SCORE_CONFIG.comboBonusPerLevel, SCORE_CONFIG.maxComboBonus);
}

export function getErrorPenalty(errorType: ErrorType): number {
  switch (errorType) {
    case 'classification':
      return SCORE_CONFIG.wrongClassification;
    case 'security_level':
      return SCORE_CONFIG.wrongSecurityLevel;
    case 'retention_period':
      return SCORE_CONFIG.wrongRetentionPeriod;
    case 'borrow_not_registered':
      return SCORE_CONFIG.borrowNotRegistered;
    default:
      return 0;
  }
}

export function calculateAccuracy(correctCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function getGrade(accuracy: number): string {
  if (accuracy >= 90) return 'S';
  if (accuracy >= 80) return 'A';
  if (accuracy >= 70) return 'B';
  if (accuracy >= 60) return 'C';
  return 'D';
}
