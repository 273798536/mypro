import type { Card, ErrorType, MaterialType, PlayerAction, SecurityLevel, RetentionPeriod } from '@/types';

export function validateClassification(card: Card, selectedType: MaterialType): boolean {
  return card.materialType === selectedType;
}

export function validateSecurityLevel(card: Card, selectedLevel: SecurityLevel): boolean {
  return card.correctSecurityLevel === selectedLevel;
}

export function validateRetentionPeriod(card: Card, selectedPeriod: RetentionPeriod): boolean {
  return card.correctRetentionPeriod === selectedPeriod;
}

export function validateBorrowRegistration(card: Card, isRegistered: boolean): boolean {
  if (card.hasBorrowRequest) {
    return isRegistered;
  }
  return true;
}

export function getErrors(
  card: Card,
  action: Omit<PlayerAction, 'timestamp' | 'errors' | 'scoreChange'>
): ErrorType[] {
  const errors: ErrorType[] = [];

  if (!validateClassification(card, action.selectedType)) {
    errors.push('classification');
  }

  if (!validateSecurityLevel(card, action.selectedSecurityLevel)) {
    errors.push('security_level');
  }

  if (!validateRetentionPeriod(card, action.selectedRetentionPeriod)) {
    errors.push('retention_period');
  }

  if (!validateBorrowRegistration(card, action.isBorrowRegistered)) {
    errors.push('borrow_not_registered');
  }

  return errors;
}

export function getCorrectAnswer(card: Card): {
  materialType: MaterialType;
  securityLevel: SecurityLevel;
  retentionPeriod: RetentionPeriod;
  isBorrowRegistered: boolean;
} {
  return {
    materialType: card.materialType,
    securityLevel: card.correctSecurityLevel,
    retentionPeriod: card.correctRetentionPeriod,
    isBorrowRegistered: card.hasBorrowRequest,
  };
}

export function getRuleHints(card: Card): string[] {
  return card.hints;
}

export function getSecurityLevelRange(materialType: MaterialType): SecurityLevel[] {
  switch (materialType) {
    case 'contract':
      return ['internal', 'secret', 'confidential'];
    case 'invoice':
      return ['internal', 'secret'];
    case 'confidential':
      return ['secret', 'confidential', 'top_secret'];
    default:
      return [];
  }
}

export function getRetentionPeriodOptions(materialType: MaterialType): RetentionPeriod[] {
  switch (materialType) {
    case 'contract':
      return ['permanent', '30years'];
    case 'invoice':
      return ['30years', '10years'];
    case 'confidential':
      return ['permanent', '30years'];
    default:
      return [];
  }
}
