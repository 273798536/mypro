import type { Claim, Receipt, AnomalyType, DeductRule } from '@/types';

export interface CalculationResult {
  deductible: number;
  payoutAmount: number;
  coinsuranceRate: number;
  totalAmount: number;
  calculationSteps: string[];
}

export function calculatePayout(
  totalAmount: number,
  deductRule: DeductRule
): CalculationResult {
  const deductible = deductRule.deductibleAmount;
  const coinsuranceRate = deductRule.coinsuranceRate;
  const eligibleAmount = Math.max(0, totalAmount - deductible);
  const payoutAmount = Math.round(eligibleAmount * coinsuranceRate * 100) / 100;

  const steps: string[] = [
    `总医疗费用：${totalAmount.toFixed(2)} 元`,
    `免赔额：${deductible.toFixed(2)} 元`,
    `可赔付基数：${totalAmount.toFixed(2)} - ${deductible.toFixed(2)} = ${eligibleAmount.toFixed(2)} 元`,
    `共保比例：${(coinsuranceRate * 100).toFixed(0)}%`,
    `赔付金额：${eligibleAmount.toFixed(2)} × ${coinsuranceRate.toFixed(2)} = ${payoutAmount.toFixed(2)} 元`,
  ];

  return {
    deductible,
    payoutAmount,
    coinsuranceRate,
    totalAmount,
    calculationSteps: steps,
  };
}

export function detectDuplicateReceipts(
  receipts: Receipt[],
  allReceiptNos: Set<string>
): { duplicates: Receipt[]; receiptNos: Set<string> } {
  const duplicates: Receipt[] = [];
  const newReceiptNos = new Set(allReceiptNos);

  receipts.forEach((receipt) => {
    if (newReceiptNos.has(receipt.receiptNo)) {
      duplicates.push({ ...receipt, isDuplicate: true });
    } else {
      newReceiptNos.add(receipt.receiptNo);
    }
  });

  return { duplicates, receiptNos: newReceiptNos };
}

export function detectCrossYear(claim: Claim): boolean {
  const { policy, receipts } = claim;

  if (!policy || !receipts || receipts.length === 0) return false;

  const policyStartYear = new Date(policy.effectiveDate).getFullYear();
  const policyEndYear = new Date(policy.expiryDate).getFullYear();

  return receipts.some((receipt) => {
    const receiptYear = new Date(receipt.issueDate).getFullYear();
    return receiptYear < policyStartYear || receiptYear > policyEndYear;
  });
}

export function detectMissingSupplement(claim: Claim): boolean {
  return claim.supplements.some((s) => s.status === 'pending');
}

export function detectAnomalies(
  claim: Claim,
  allReceiptNos: Set<string>
): AnomalyType[] {
  const anomalies: AnomalyType[] = [];

  const { duplicates } = detectDuplicateReceipts(claim.receipts, allReceiptNos);
  if (duplicates.length > 0) {
    anomalies.push('duplicate_receipt');
  }

  if (detectCrossYear(claim)) {
    anomalies.push('cross_year');
  }

  if (detectMissingSupplement(claim)) {
    anomalies.push('missing_supplement');
  }

  if (claim.needsRecalculate) {
    anomalies.push('not_recalculated');
  }

  return anomalies;
}

export function matchDeductRule(
  policyProductName: string,
  rules: DeductRule[]
): DeductRule | undefined {
  if (policyProductName.includes('门诊')) {
    return rules.find((r) => r.ruleName.includes('门诊')) || rules[0];
  }
  if (policyProductName.includes('住院')) {
    return rules.find((r) => r.ruleName.includes('住院')) || rules[0];
  }
  return rules.find((r) => r.ruleName.includes('小额')) || rules[0];
}

export function generateCalculationNote(
  result: CalculationResult,
  deductRule: DeductRule,
  anomalies: AnomalyType[]
): string {
  let note = `【赔付计算说明】\n\n`;
  note += `适用规则：${deductRule.ruleName}\n`;
  note += `规则说明：${deductRule.applicableScope}\n\n`;
  note += `计算过程：\n`;
  result.calculationSteps.forEach((step, index) => {
    note += `${index + 1}. ${step}\n`;
  });

  if (anomalies.length > 0) {
    note += `\n【异常提示】\n`;
    if (anomalies.includes('duplicate_receipt')) {
      note += '- ⚠️ 检测到重复票据，请核实后再处理\n';
    }
    if (anomalies.includes('cross_year')) {
      note += '- ⚠️ 票据日期跨保单年度，请确认免赔规则适用\n';
    }
    if (anomalies.includes('not_recalculated')) {
      note += '- ⚠️ 数据已更新，需重新计算赔付金额\n';
    }
    if (anomalies.includes('missing_supplement')) {
      note += '- ⚠️ 存在待补充材料\n';
    }
  }

  return note;
}
