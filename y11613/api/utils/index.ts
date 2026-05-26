import crypto from 'crypto';

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export function calculateBonus(principalAmount: number, tiers: Array<{ minAmount: number; bonusRate: number; maxBonus?: number }>): number {
  let applicableTier = tiers[0];
  for (const tier of tiers) {
    if (principalAmount >= tier.minAmount) {
      applicableTier = tier;
    }
  }
  if (!applicableTier) return 0;
  
  let bonus = principalAmount * applicableTier.bonusRate;
  if (applicableTier.maxBonus && bonus > applicableTier.maxBonus) {
    bonus = applicableTier.maxBonus;
  }
  return Math.round(bonus * 100) / 100;
}

export function splitConsumptionAmount(
  amount: number,
  principalBalance: number,
  bonusBalance: number,
  priority: 'bonus_first' | 'principal_first'
): { principalUsed: number; bonusUsed: number } {
  let principalUsed = 0;
  let bonusUsed = 0;
  let remaining = amount;

  if (priority === 'bonus_first') {
    bonusUsed = Math.min(bonusBalance, remaining);
    remaining -= bonusUsed;
    if (remaining > 0) {
      principalUsed = Math.min(principalBalance, remaining);
    }
  } else {
    principalUsed = Math.min(principalBalance, remaining);
    remaining -= principalUsed;
    if (remaining > 0) {
      bonusUsed = Math.min(bonusBalance, remaining);
    }
  }

  return { principalUsed, bonusUsed };
}

export function detectException(cardStatus: string, isReverse: boolean, isCrossStore: boolean): { isException: boolean; exceptionType?: string } {
  if (cardStatus === 'refunded') {
    return { isException: true, exceptionType: 'consume_after_refund' };
  }
  if (isReverse && isCrossStore) {
    return { isException: true, exceptionType: 'cross_store_reverse' };
  }
  return { isException: false };
}
