import type {
  PaymentReceipt,
  Invoice,
  FactoringContract,
  FeeConfig,
  SplitResult,
  SplitException,
} from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const roundToTwo = (num: number): number => {
  return Math.round(num * 100) / 100;
};

interface MatchContext {
  invoices: Invoice[];
  contracts: FactoringContract[];
  fees: FeeConfig[];
}

export interface SplitResultWithExceptions {
  splits: SplitResult[];
  exceptions: SplitException[];
}

export const matchInvoicesByContract = (
  payment: PaymentReceipt,
  ctx: MatchContext
): Invoice[] => {
  const matchedContracts = ctx.contracts.filter((c) =>
    payment.payer.includes(c.contractNo) ||
    payment.source.includes(c.contractNo)
  );

  const sellerIds = matchedContracts.map((c) => c.sellerId);

  return ctx.invoices.filter(
    (inv) =>
      inv.status !== 'closed' &&
      inv.remainAmount > 0 &&
      (sellerIds.includes(inv.sellerId) ||
        matchedContracts.some((c) => c.contractNo === inv.contractNo))
  );
};

export const matchInvoicesBySeller = (
  payment: PaymentReceipt,
  ctx: MatchContext
): Invoice[] => {
  return ctx.invoices.filter(
    (inv) =>
      inv.status !== 'closed' &&
      inv.remainAmount > 0 &&
      payment.payer.includes(inv.sellerName)
  );
};

export const matchInvoicesByAmount = (
  payment: PaymentReceipt,
  invoices: Invoice[]
): Invoice[] => {
  const sorted = [...invoices].sort(
    (a, b) =>
      Math.abs(a.remainAmount - payment.totalAmount) -
      Math.abs(b.remainAmount - payment.totalAmount)
  );

  let remaining = payment.totalAmount;
  const matched: Invoice[] = [];

  for (const inv of sorted) {
    if (remaining <= 0) break;
    if (inv.remainAmount <= remaining) {
      matched.push(inv);
      remaining -= inv.remainAmount;
    } else if (matched.length === 0) {
      matched.push(inv);
      break;
    }
  }

  return matched;
};

export const calculateFee = (
  amount: number,
  feeConfig: FeeConfig | undefined
): { feeAmount: number; actualAmount: number } => {
  if (!feeConfig) {
    return { feeAmount: 0, actualAmount: amount };
  }

  const feeAmount = roundToTwo(amount * feeConfig.rate);

  if (feeConfig.type === 'deduct_inner') {
    return {
      feeAmount,
      actualAmount: roundToTwo(amount - feeAmount),
    };
  }

  return {
    feeAmount,
    actualAmount: amount,
  };
};

export const performSplit = (
  payment: PaymentReceipt,
  matchedInvoices: Invoice[],
  ctx: MatchContext
): SplitResult[] => {
  if (matchedInvoices.length === 0) {
    return [];
  }

  const totalRemainAmount = matchedInvoices.reduce(
    (sum, inv) => sum + inv.remainAmount,
    0
  );

  const isExactMatch =
    matchedInvoices.length === 1 &&
    matchedInvoices[0].remainAmount <= payment.totalAmount;

  if (isExactMatch) {
    const invoice = matchedInvoices[0];
    const splitAmount = Math.min(invoice.remainAmount, payment.totalAmount);
    const contract = ctx.contracts.find((c) => c.contractNo === invoice.contractNo);
    const feeConfig = ctx.fees[0];

    const { feeAmount, actualAmount } = calculateFee(
      splitAmount,
      feeConfig
    );

    return [
      {
        id: generateId(),
        paymentId: payment.id,
        invoiceId: invoice.id,
        sellerId: invoice.sellerId,
        sellerName: invoice.sellerName,
        invoiceNo: invoice.invoiceNo,
        splitAmount,
        feeAmount,
        actualAmount,
        status: 'normal',
        isDispute: invoice.status === 'disputed',
        source: '自动匹配',
        splitRatio: 1,
      },
    ];
  }

  const splits: SplitResult[] = [];
  let remainingAmount = payment.totalAmount;

  for (let i = 0; i < matchedInvoices.length; i++) {
    const invoice = matchedInvoices[i];
    const isLast = i === matchedInvoices.length - 1;

    const ratio = invoice.remainAmount / totalRemainAmount;
    let splitAmount: number;

    if (isLast) {
      splitAmount = remainingAmount;
    } else {
      splitAmount = roundToTwo(payment.totalAmount * ratio);
    }

    splitAmount = Math.min(splitAmount, invoice.remainAmount, remainingAmount);

    const contract = ctx.contracts.find((c) => c.contractNo === invoice.contractNo);
    const feeConfig = ctx.fees[0];

    const { feeAmount, actualAmount } = calculateFee(
      splitAmount,
      feeConfig
    );

    splits.push({
      id: generateId(),
      paymentId: payment.id,
      invoiceId: invoice.id,
      sellerId: invoice.sellerId,
      sellerName: invoice.sellerName,
      invoiceNo: invoice.invoiceNo,
      splitAmount,
      feeAmount,
      actualAmount,
      status: invoice.status === 'disputed' ? 'disputed' : 'normal',
      isDispute: invoice.status === 'disputed',
      source: '比例拆分',
      splitRatio: roundToTwo(ratio),
    });

    remainingAmount = roundToTwo(remainingAmount - splitAmount);

    if (remainingAmount <= 0) break;
  }

  return splits;
};

export const detectExceptions = (
  payment: PaymentReceipt,
  splits: SplitResult[],
  ctx: MatchContext
): SplitException[] => {
  const exceptions: SplitException[] = [];

  if (splits.length >= 2) {
    exceptions.push({
      id: generateId(),
      paymentId: payment.id,
      type: 'multi_invoice',
      level: 'warning',
      message: `该回款匹配到 ${splits.length} 张发票，已按比例拆分，请核对拆分比例`,
      resolved: false,
      relatedSplitIds: splits.map((s) => s.id),
    });
  }

  const hasInnerFee = ctx.fees.some((f) => f.type === 'deduct_inner');
  if (hasInnerFee && splits.some((s) => s.feeAmount > 0)) {
    exceptions.push({
      id: generateId(),
      paymentId: payment.id,
      type: 'fee_deduct_inner',
      level: 'warning',
      message: '手续费内扣模式：手续费已从回款金额中扣除，实际到账金额已扣减',
      resolved: false,
      relatedSplitIds: splits.filter((s) => s.feeAmount > 0).map((s) => s.id),
    });
  }

  const disputedSplits = splits.filter((s) => s.isDispute);
  if (disputedSplits.length > 0) {
    exceptions.push({
      id: generateId(),
      paymentId: payment.id,
      type: 'invoice_dispute',
      level: 'error',
      message: `存在 ${disputedSplits.length} 张争议发票，已隔离处理，需人工确认`,
      resolved: false,
      relatedSplitIds: disputedSplits.map((s) => s.id),
    });
  }

  const totalSplitAmount = splits.reduce((sum, s) => sum + s.splitAmount, 0);
  if (Math.abs(totalSplitAmount - payment.totalAmount) > 0.01) {
    exceptions.push({
      id: generateId(),
      paymentId: payment.id,
      type: 'amount_mismatch',
      level: 'info',
      message: `金额差异 ${roundToTwo(Math.abs(totalSplitAmount - payment.totalAmount))} 元，需检查余额`,
      resolved: false,
    });
  }

  return exceptions;
};

export const processPayment = (
  payment: PaymentReceipt,
  ctx: MatchContext
): SplitResultWithExceptions => {
  let matchedInvoices = matchInvoicesByContract(payment, ctx);

  if (matchedInvoices.length === 0) {
    matchedInvoices = matchInvoicesBySeller(payment, ctx);
  }

  if (matchedInvoices.length === 0) {
    matchedInvoices = ctx.invoices.filter(
      (inv) => inv.status !== 'closed' && inv.remainAmount > 0
    );
  }

  matchedInvoices = matchInvoicesByAmount(payment, matchedInvoices);

  const splits = performSplit(payment, matchedInvoices, ctx);
  const exceptions = detectExceptions(payment, splits, ctx);

  return { splits, exceptions };
};

export const batchProcessPayments = (
  payments: PaymentReceipt[],
  ctx: MatchContext
): {
  allSplits: SplitResult[];
  allExceptions: SplitException[];
} => {
  const allSplits: SplitResult[] = [];
  const allExceptions: SplitException[] = [];
  const usedInvoices = new Set<string>();

  for (const payment of payments) {
    const availableInvoices = ctx.invoices.filter(
      (inv) => !usedInvoices.has(inv.id)
    );

    const result = processPayment(payment, {
      ...ctx,
      invoices: availableInvoices,
    });

    allSplits.push(...result.splits);
    allExceptions.push(...result.exceptions);

    result.splits.forEach((s) => usedInvoices.add(s.invoiceId));
  }

  return { allSplits, allExceptions };
};

export const recalculateBalances = (
  splits: SplitResult[],
  paymentTotal: number
): { splits: SplitResult[]; unmatchedAmount: number } => {
  const currentTotal = splits.reduce((sum, s) => sum + s.splitAmount, 0);
  const diff = roundToTwo(paymentTotal - currentTotal);

  if (Math.abs(diff) < 0.01 || splits.length === 0) {
    return { splits, unmatchedAmount: 0 };
  }

  const lastSplit = splits[splits.length - 1];
  const newSplitAmount = roundToTwo(lastSplit.splitAmount + diff);

  const feeConfig: FeeConfig = {
    id: 'temp',
    name: '默认',
    rate: 0,
    type: 'deduct_outer',
  };

  const { feeAmount, actualAmount } = calculateFee(newSplitAmount, feeConfig);

  const updatedSplits = [
    ...splits.slice(0, -1),
    {
      ...lastSplit,
      splitAmount: newSplitAmount,
      feeAmount,
      actualAmount,
    },
  ];

  return { splits: updatedSplits, unmatchedAmount: 0 };
};
