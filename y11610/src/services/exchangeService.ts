import { db } from '../db/dexie';
import {
  ExchangeLoss,
  LossType,
  AnomalyType,
  MatchingRecord,
  CustomerOrder,
  BankStatement,
  PlatformBill,
  ExchangeRate,
  LossStatus,
} from '../types';
import { getDaysDiff, getNow } from '../utils/date';

export interface LossCalculationResult {
  success: number;
  failed: number;
  total: number;
  anomalies: number;
  records: ExchangeLoss[];
}

interface AnomalyCheckResult {
  anomalyType: AnomalyType;
  description: string;
}

function checkAnomalies(
  order: CustomerOrder,
  statement: BankStatement,
  bill?: PlatformBill,
  rate?: ExchangeRate
): AnomalyCheckResult[] {
  const anomalies: AnomalyCheckResult[] = [];

  if (rate) {
    const daysDiff = getDaysDiff(order.orderDate, rate.date);
    if (daysDiff > 3) {
      anomalies.push({
        anomalyType: 'rate_date_mismatch',
        description: `汇率日期(${rate.date})与订单日期(${order.orderDate})相差${daysDiff}天，超过3天阈值`,
      });
    }
  } else {
    anomalies.push({
      anomalyType: 'rate_date_mismatch',
      description: `未找到 ${order.currency} 对 ${statement.currency} 的汇率数据`,
    });
  }

  if (statement.receivedAmount < order.amount * 0.95) {
    const diffPercent = ((order.amount - statement.receivedAmount) / order.amount) * 100;
    anomalies.push({
      anomalyType: 'partial_receipt',
      description: `实际到账金额比订单金额少${diffPercent.toFixed(2)}%，疑似部分到账`,
    });
  }

  if (bill && bill.feeAmount > 0) {
    const feePercent = (bill.feeAmount / bill.grossAmount) * 100;
    if (feePercent > 5) {
      anomalies.push({
        anomalyType: 'fee_deducted',
        description: `平台手续费占比${feePercent.toFixed(2)}%，超过正常范围(5%)`,
      });
    }
  }

  return anomalies;
}

function determineLossType(anomalies: AnomalyCheckResult[]): LossType {
  if (anomalies.some((a) => a.anomalyType === 'partial_receipt')) {
    return 'partial';
  }
  if (anomalies.some((a) => a.anomalyType === 'fee_deducted')) {
    return 'fee';
  }
  if (anomalies.some((a) => a.anomalyType === 'rate_date_mismatch')) {
    return 'rate';
  }
  return 'normal';
}

export async function calculateExchangeLoss(matchingId: string): Promise<ExchangeLoss | null> {
  const matching = await db.matchingRecords.get(matchingId);
  if (!matching) return null;

  const [order, statement, bill] = await Promise.all([
    db.customerOrders.get(matching.orderId),
    db.bankStatements.get(matching.statementId),
    matching.billId ? db.platformBills.get(matching.billId) : Promise.resolve(undefined),
  ]);

  if (!order || !statement) return null;

  const existingLoss = await db.exchangeLosses.where('matchingId').equals(matchingId).first();
  if (existingLoss) {
    return existingLoss;
  }

  const rates = await db.exchangeRates
    .where('[baseCurrency+targetCurrency+date]')
    .between(
      [order.currency, statement.currency, ''],
      [order.currency, statement.currency, '\uffff']
    )
    .toArray();

  let rate: ExchangeRate | undefined;
  if (rates.length > 0) {
    rate = rates
      .filter((r) => getDaysDiff(r.date, order.orderDate) <= 7)
      .sort((a, b) => getDaysDiff(a.date, order.orderDate) - getDaysDiff(b.date, order.orderDate))[0];

    if (!rate) {
      rate = rates.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
    }
  }

  const anomalies = checkAnomalies(order, statement, bill, rate);
  const lossType = determineLossType(anomalies);
  const anomalyType = anomalies.length > 0 ? anomalies[0].anomalyType : 'none';
  const anomalyDescription = anomalies.map((a) => a.description).join('; ');

  const expectedAmount = rate ? order.amount * rate.rate : order.amount;
  const actualAmount = statement.receivedAmount;
  const lossAmount = expectedAmount - actualAmount;
  const lossRate = expectedAmount > 0 ? lossAmount / expectedAmount : 0;

  const loss: ExchangeLoss = {
    id: crypto.randomUUID(),
    matchingId,
    orderId: order.id,
    rateId: rate?.id || '',
    expectedAmount,
    actualAmount,
    lossAmount,
    lossRate,
    lossType,
    anomalyType,
    anomalyDescription,
    calculationDate: getNow(),
    status: 'pending',
  };

  await db.exchangeLosses.add(loss);
  return loss;
}

export async function calculateAllExchangeLosses(): Promise<LossCalculationResult> {
  const matchings = await db.matchingRecords.toArray();
  const result: LossCalculationResult = {
    success: 0,
    failed: 0,
    total: 0,
    anomalies: 0,
    records: [],
  };

  await db.exchangeLosses.clear();

  for (const matching of matchings) {
    try {
      const loss = await calculateExchangeLoss(matching.id);
      if (loss) {
        result.records.push(loss);
        result.success++;
        if (loss.anomalyType !== 'none') {
          result.anomalies++;
        }
      } else {
        result.failed++;
      }
    } catch (error) {
      result.failed++;
    }
  }

  result.total = result.success + result.failed;

  return result;
}

export async function updateLossStatus(lossId: string, status: LossStatus): Promise<void> {
  const loss = await db.exchangeLosses.get(lossId);
  if (!loss) return;

  await db.exchangeLosses.update(lossId, { status });
}

export async function adjustLossAmount(
  lossId: string,
  newLossAmount: number,
  remark: string
): Promise<void> {
  const loss = await db.exchangeLosses.get(lossId);
  if (!loss) return;

  const oldLossAmount = loss.lossAmount;
  const newLossRate = loss.expectedAmount > 0 ? newLossAmount / loss.expectedAmount : 0;

  await db.exchangeLosses.update(lossId, {
    lossAmount: newLossAmount,
    lossRate: newLossRate,
    status: 'adjusted',
  });

  const auditLog = {
    id: crypto.randomUUID(),
    lossId,
    fieldName: 'lossAmount',
    oldValue: oldLossAmount.toString(),
    newValue: newLossAmount.toString(),
    operator: '当前用户',
    operatedAt: getNow(),
    remark,
  };

  await db.auditLogs.add(auditLog);
}

export async function getLossWithDetails(
  lossId: string
): Promise<{
  loss: ExchangeLoss;
  matching: MatchingRecord;
  order: CustomerOrder;
  statement: BankStatement;
  bill?: PlatformBill;
  rate?: ExchangeRate;
  auditLogs: { id: string; fieldName: string; oldValue: string; newValue: string; operator: string; operatedAt: string; remark: string }[];
} | null> {
  const loss = await db.exchangeLosses.get(lossId);
  if (!loss) return null;

  const matching = await db.matchingRecords.get(loss.matchingId);
  if (!matching) return null;

  const [order, statement, bill, rate, auditLogs] = await Promise.all([
    db.customerOrders.get(matching.orderId),
    db.bankStatements.get(matching.statementId),
    matching.billId ? db.platformBills.get(matching.billId) : Promise.resolve(undefined),
    loss.rateId ? db.exchangeRates.get(loss.rateId) : Promise.resolve(undefined),
    db.auditLogs.where('lossId').equals(lossId).toArray(),
  ]);

  if (!order || !statement) return null;

  return { loss, matching, order, statement, bill, rate, auditLogs };
}
