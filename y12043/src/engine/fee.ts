import { FeeRecord, Fund, Decision } from '@/types';

export function calculateFrequentTradingBonus(
  decisions: Decision[],
  currentStep: number
): number {
  const recentDecisions = decisions.filter(d => d.step >= currentStep - 2 && d.fundId);
  const tradeCount = recentDecisions.length;
  return tradeCount * 0.1;
}

export function calculateBuyFee(
  amount: number,
  fund: Fund,
  decisions: Decision[],
  currentStep: number
): { immediateFee: number; delayedFee: number } {
  const frequentBonus = calculateFrequentTradingBonus(decisions, currentStep);
  const totalFeeRate = fund.feeRate * (1 + frequentBonus);
  const totalFee = amount * totalFeeRate;
  
  return {
    immediateFee: totalFee * 0.7,
    delayedFee: totalFee * 0.3,
  };
}

export function createFeeRecords(
  step: number,
  amount: number,
  fund: Fund,
  decisions: Decision[],
  currentStep: number
): { immediate: FeeRecord; delayed: FeeRecord } {
  const { immediateFee, delayedFee } = calculateBuyFee(amount, fund, decisions, currentStep);
  
  return {
    immediate: {
      step,
      amount: immediateFee,
      type: 'buy',
      isDeducted: true,
      deductedAt: Date.now(),
      fundId: fund.id,
    },
    delayed: {
      step,
      amount: delayedFee,
      type: 'buy',
      isDeducted: false,
      fundId: fund.id,
    },
  };
}

export function processDelayedFees(
  fees: FeeRecord[],
  currentStep: number,
  delaySteps: number = 2
): { updatedFees: FeeRecord[]; totalDeducted: number } {
  let totalDeducted = 0;
  const updatedFees = fees.map(fee => {
    if (!fee.isDeducted && currentStep - fee.step >= delaySteps) {
      totalDeducted += fee.amount;
      return {
        ...fee,
        isDeducted: true,
        deductedAt: Date.now(),
      };
    }
    return fee;
  });
  
  return { updatedFees, totalDeducted };
}

export function findMissedFees(fees: FeeRecord[]): FeeRecord[] {
  return fees.filter(fee => !fee.isDeducted);
}

export function getTotalFees(fees: FeeRecord[]): number {
  return fees.reduce((sum, fee) => sum + fee.amount, 0);
}

export function getDeductedFees(fees: FeeRecord[]): number {
  return fees.filter(f => f.isDeducted).reduce((sum, fee) => sum + fee.amount, 0);
}
