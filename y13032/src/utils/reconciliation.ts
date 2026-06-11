import type {
  BankTransaction,
  CalculationRule,
  DashboardStats,
  CaliberDistribution,
  TransactionStatus,
  JudgmentResult,
} from '@/types';

export function calculateDashboardStats(
  transactions: BankTransaction[]
): DashboardStats {
  const doubleCaliberCount = transactions.filter(
    (t) => t.status === 'double_caliber'
  ).length;
  const singleCaliberCount = transactions.filter(
    (t) => t.status === 'single_caliber'
  ).length;
  const normalCount = transactions.filter((t) => t.status === 'normal').length;

  const anomalousTransactions = transactions.filter(
    (t) => t.status !== 'normal'
  );
  const totalAnomalies = anomalousTransactions.length;
  const totalAmount = anomalousTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  return {
    totalAnomalies,
    totalAmount,
    doubleCaliberCount,
    singleCaliberCount,
    normalCount,
  };
}

export function getCaliberDistribution(
  transactions: BankTransaction[]
): CaliberDistribution[] {
  const stats = calculateDashboardStats(transactions);
  return [
    {
      name: '双口径重复认领',
      value: stats.doubleCaliberCount,
      color: '#E8833A',
    },
    {
      name: '单口径认领',
      value: stats.singleCaliberCount,
      color: '#436090',
    },
    {
      name: '正常',
      value: stats.normalCount,
      color: '#2E933C',
    },
  ];
}

export function getRulesByTransaction(
  rules: CalculationRule[],
  transactionId: string
): CalculationRule[] {
  return rules.filter((r) => r.transactionId === transactionId);
}

export function getRulesByCaliber(
  rules: CalculationRule[],
  transactionId: string,
  caliber: 'supply_chain_prepayment' | 'operating_expense'
): CalculationRule[] {
  return rules.filter(
    (r) => r.transactionId === transactionId && r.caliberName === caliber
  );
}

export function detectConflicts(
  rules: CalculationRule[],
  transactionId: string
): boolean {
  const txRules = getRulesByTransaction(rules, transactionId);
  const supplyChainMatched = txRules.some(
    (r) => r.caliberName === 'supply_chain_prepayment' && r.judgmentResult === 'matched'
  );
  const operatingMatched = txRules.some(
    (r) => r.caliberName === 'operating_expense' && r.judgmentResult === 'matched'
  );
  return supplyChainMatched && operatingMatched;
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmountWithYuan(amount: number): string {
  return `¥ ${formatAmount(amount)}`;
}

export function getStatusLabel(status: BankTransaction['status']): string {
  const map: Record<BankTransaction['status'], string> = {
    normal: '正常',
    single_caliber: '单口径认领',
    double_caliber: '双口径重复认领',
  };
  return map[status];
}

export function getStatusColorClass(status: BankTransaction['status']): string {
  const map: Record<BankTransaction['status'], string> = {
    normal: 'text-emerald bg-emerald/10',
    single_caliber: 'text-navy-600 bg-navy-100',
    double_caliber: 'text-amber-dark bg-amber/15',
  };
  return map[status];
}

export interface RecalcResult {
  updatedRules: CalculationRule[];
  newStatus: TransactionStatus;
  supplyMatched: boolean;
  operatingMatched: boolean;
}

export function recalculateAfterRemark(
  allRules: CalculationRule[],
  transactionId: string,
  affectedRuleIds: string[]
): RecalcResult {
  const voidAffected = affectedRuleIds.length > 0;

  const step1 = allRules.map((r): CalculationRule => {
    if (r.transactionId !== transactionId) return r;
    if (voidAffected && affectedRuleIds.includes(r.id)) {
      return {
        ...r,
        isHit: false,
        judgmentResult: 'unmatched' as JudgmentResult,
        isConflict: false,
      };
    }
    return r;
  });

  const txRules = step1.filter((r) => r.transactionId === transactionId);
  const supplyMatched = txRules.some(
    (r) => r.caliberName === 'supply_chain_prepayment' && r.judgmentResult === 'matched'
  );
  const operatingMatched = txRules.some(
    (r) => r.caliberName === 'operating_expense' && r.judgmentResult === 'matched'
  );
  const hasBoth = supplyMatched && operatingMatched;

  const updatedRules = step1.map((r): CalculationRule => {
    if (r.transactionId !== transactionId) return r;
    if (r.judgmentResult !== 'matched') return { ...r, isConflict: false };
    return { ...r, isConflict: hasBoth };
  });

  let newStatus: TransactionStatus;
  if (supplyMatched && operatingMatched) {
    newStatus = 'double_caliber';
  } else if (supplyMatched || operatingMatched) {
    newStatus = 'single_caliber';
  } else {
    newStatus = 'normal';
  }

  return { updatedRules, newStatus, supplyMatched, operatingMatched };
}

export function buildConclusionForStatus(
  status: TransactionStatus,
  amount: number,
  supplyMatched: boolean,
  operatingMatched: boolean
): string {
  const amountText = formatAmountWithYuan(amount);
  if (status === 'double_caliber') {
    return `当前判断：${amountText} 同时被供应链预付款口径和运营费用口径认领，属于双口径重复认领，请继续复核。`;
  }
  if (status === 'single_caliber') {
    const caliber = supplyMatched ? '供应链预付款口径' : '运营费用口径';
    return `当前判断：${amountText} 归入「${caliber}」（单口径认领，无冲突）。`;
  }
  return `当前判断：${amountText} 未被任何口径命中，状态标记为「正常」，建议人工抽查原始流水后归档。`;
}
