import type {
  Contract,
  InstallmentBill,
  TreatmentRecord,
  Gift,
  Anomaly,
  RefundCalculation,
  FeePayer,
} from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function calculateTreatmentAmounts(
  treatments: TreatmentRecord[]
): { verifiedTotal: number; unverifiedTotal: number; verifiedCount: number } {
  let verifiedTotal = 0;
  let unverifiedTotal = 0;
  let verifiedCount = 0;

  treatments.forEach((t) => {
    const amount = t.unitPrice * t.quantity;
    if (t.isVerified) {
      verifiedTotal += amount;
      verifiedCount += t.quantity;
    } else {
      unverifiedTotal += amount;
    }
  });

  return { verifiedTotal, unverifiedTotal, verifiedCount };
}

export function calculateFeeShares(
  totalFee: number,
  feePayer: FeePayer,
  feePayerRatio?: number
): { customerFeeShare: number; storeFeeShare: number } {
  switch (feePayer) {
    case 'customer':
      return { customerFeeShare: totalFee, storeFeeShare: 0 };
    case 'store':
      return { customerFeeShare: 0, storeFeeShare: totalFee };
    case 'institution':
      return { customerFeeShare: 0, storeFeeShare: 0 };
    case 'shared': {
      const ratio = feePayerRatio ?? 0.5;
      return {
        customerFeeShare: totalFee * ratio,
        storeFeeShare: totalFee * (1 - ratio),
      };
    }
    default:
      return { customerFeeShare: 0, storeFeeShare: totalFee };
  }
}

export function calculateGiftDeduction(
  gifts: Gift[]
): { giftTotalValue: number; giftReturnedValue: number; giftDeduction: number } {
  let giftTotalValue = 0;
  let giftReturnedValue = 0;

  gifts.forEach((g) => {
    const totalValue = g.value * g.quantity;
    giftTotalValue += totalValue;

    if (g.isReturned) {
      const returnedQty = g.returnedQuantity ?? g.quantity;
      giftReturnedValue += g.value * returnedQty;
    }
  });

  const giftDeduction = giftTotalValue - giftReturnedValue;

  return { giftTotalValue, giftReturnedValue, giftDeduction };
}

export function detectAnomalies(
  contract: Contract,
  treatments: TreatmentRecord[],
  gifts: Gift[],
  installment: InstallmentBill | undefined
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();

  const unverifiedTreatments = treatments.filter((t) => !t.isVerified);
  if (unverifiedTreatments.length > 0) {
    anomalies.push({
      id: generateId(),
      type: 'unverified_treatment',
      severity: 'warning',
      title: '存在未核销项目',
      description: `发现 ${unverifiedTreatments.length} 个未核销的项目，涉及金额 ${unverifiedTreatments.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0).toFixed(2)} 元。未核销项目不会计入已消费金额。`,
      suggestion: '请确认这些项目是否已实际执行，如已执行请标记为已核销。',
      relatedData: { count: unverifiedTreatments.length, items: unverifiedTreatments.map((t) => t.treatmentName) },
      isResolved: false,
      detectedTime: now,
    });
  }

  const unreturnedGifts = gifts.filter((g) => !g.isReturned);
  if (unreturnedGifts.length > 0) {
    anomalies.push({
      id: generateId(),
      type: 'gift_not_returned',
      severity: 'critical',
      title: '存在未归还赠品',
      description: `发现 ${unreturnedGifts.length} 件赠品未归还，扣回金额 ${unreturnedGifts.reduce((sum, g) => sum + g.value * g.quantity, 0).toFixed(2)} 元。`,
      suggestion: '请确认赠品是否已归还客户，如未归还请在退款中扣回相应价值。',
      relatedData: { count: unreturnedGifts.length, items: unreturnedGifts.map((g) => g.giftName) },
      isResolved: false,
      detectedTime: now,
    });
  }

  const completedCount = treatments.length;
  if (completedCount > 0 && completedCount < contract.treatmentCount) {
    const progress = ((completedCount / contract.treatmentCount) * 100).toFixed(1);
    anomalies.push({
      id: generateId(),
      type: 'partial_treatment',
      severity: 'info',
      title: '疗程部分完成',
      description: `该疗程共 ${contract.treatmentCount} 次，已完成 ${completedCount} 次，完成进度 ${progress}%。`,
      suggestion: '退款金额将按已完成项目比例计算，请确认计算方式是否正确。',
      relatedData: { total: contract.treatmentCount, completed: completedCount, progress },
      isResolved: false,
      detectedTime: now,
    });
  }

  if (installment && installment.feePayer !== 'store') {
    anomalies.push({
      id: generateId(),
      type: 'fee_payer_changed',
      severity: 'warning',
      title: '手续费承担方非门店',
      description: `当前手续费由${getFeePayerText(installment.feePayer)}承担，退款时请注意手续费分摊方式。`,
      suggestion: '请确认手续费分摊是否符合合同约定，必要时可手动调整。',
      relatedData: { feePayer: installment.feePayer, totalFee: installment.feeAmount },
      isResolved: false,
      detectedTime: now,
    });
  }

  if (installment && installment.totalAmount !== contract.totalAmount) {
    anomalies.push({
      id: generateId(),
      type: 'data_mismatch',
      severity: 'warning',
      title: '数据金额不一致',
      description: `分期账单金额 (${installment.totalAmount} 元) 与合同金额 (${contract.totalAmount} 元) 不一致。`,
      suggestion: '请检查数据源是否正确，可能存在数据录入错误。',
      relatedData: { contractAmount: contract.totalAmount, installmentAmount: installment.totalAmount },
      isResolved: false,
      detectedTime: now,
    });
  }

  return anomalies;
}

export function getFeePayerText(feePayer: FeePayer): string {
  const map: Record<FeePayer, string> = {
    customer: '客户',
    store: '门店',
    institution: '机构',
    shared: '双方分摊',
  };
  return map[feePayer];
}

export function calculateRefund(
  contract: Contract,
  installment: InstallmentBill | undefined,
  treatments: TreatmentRecord[],
  gifts: Gift[]
): RefundCalculation {
  const { verifiedTotal, unverifiedTotal, verifiedCount } = calculateTreatmentAmounts(treatments);

  const totalFee = installment?.feeAmount ?? 0;
  const feePayer = installment?.feePayer ?? 'store';
  const feePayerRatio = installment?.feePayerRatio;
  const { customerFeeShare, storeFeeShare } = calculateFeeShares(totalFee, feePayer, feePayerRatio);

  const { giftTotalValue, giftReturnedValue, giftDeduction } = calculateGiftDeduction(gifts);

  const baseRefund = contract.totalAmount - verifiedTotal;
  const feeDeduction = customerFeeShare;
  const finalRefund = baseRefund - feeDeduction - giftDeduction;

  const paidAmount = installment?.paidAmount ?? 0;
  const actualRefund = Math.min(finalRefund, paidAmount);

  const anomalies = detectAnomalies(contract, treatments, gifts, installment);

  return {
    contractTotal: contract.totalAmount,
    verifiedTotal,
    unverifiedTotal,
    treatmentCompletedCount: verifiedCount,
    treatmentTotalCount: contract.treatmentCount,
    totalFee,
    customerFeeShare,
    storeFeeShare,
    giftTotalValue,
    giftReturnedValue,
    giftDeduction,
    baseRefund,
    feeDeduction,
    finalRefund: Math.max(0, finalRefund),
    paidAmount,
    actualRefund: Math.max(0, actualRefund),
    anomalies,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info',
  };
  return map[severity] || 'info';
}

export function getSeverityText(severity: string): string {
  const map: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    info: '提示',
  };
  return map[severity] || severity;
}
