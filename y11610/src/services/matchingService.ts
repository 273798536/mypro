import { db } from '../db/dexie';
import {
  CustomerOrder,
  BankStatement,
  PlatformBill,
  MatchingRecord,
  MatchStatus,
} from '../types';
import { getDaysDiff, getNow } from '../utils/date';

export interface MatchCandidate {
  order: CustomerOrder;
  statement: BankStatement;
  bill?: PlatformBill;
  confidence: number;
  reasons: string[];
}

export interface MatchResult {
  matched: number;
  partial: number;
  unmatched: number;
  failed: number;
  records: MatchingRecord[];
}

function calculateConfidence(
  order: CustomerOrder,
  statement: BankStatement,
  bill?: PlatformBill
): { confidence: number; reasons: string[] } {
  let confidence = 0;
  const reasons: string[] = [];

  if (bill && bill.orderNo === order.orderNo) {
    confidence += 40;
    reasons.push('平台账单订单号匹配');
  }

  const daysDiff = getDaysDiff(order.orderDate, statement.transactionDate);
  if (daysDiff <= 3) {
    confidence += 25;
    reasons.push(`交易日期相差 ${daysDiff} 天`);
  } else if (daysDiff <= 7) {
    confidence += 15;
    reasons.push(`交易日期相差 ${daysDiff} 天`);
  } else if (daysDiff <= 14) {
    confidence += 5;
    reasons.push(`交易日期相差 ${daysDiff} 天`);
  }

  const statementAmount = statement.receivedAmount;
  const orderAmount = order.amount;
  const tolerance = orderAmount * 0.01;

  if (Math.abs(statementAmount - orderAmount) <= tolerance) {
    confidence += 35;
    reasons.push('金额完全匹配');
  } else if (statementAmount < orderAmount && statementAmount > orderAmount * 0.5) {
    confidence += 15;
    reasons.push('部分金额匹配');
  }

  return { confidence, reasons };
}

function findMatchCandidates(
  orders: CustomerOrder[],
  statements: BankStatement[],
  bills: PlatformBill[]
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];
  const matchedStatementIds = new Set<string>();
  const matchedOrderIds = new Set<string>();

  for (const bill of bills) {
    const order = orders.find((o) => o.orderNo === bill.orderNo);
    if (!order) continue;

    const matchingStatements = statements.filter((s) => {
      if (matchedStatementIds.has(s.id)) return false;
      const daysDiff = getDaysDiff(bill.billDate, s.transactionDate);
      return daysDiff <= 14;
    });

    for (const statement of matchingStatements) {
      const { confidence, reasons } = calculateConfidence(order, statement, bill);
      if (confidence >= 50) {
        candidates.push({ order, statement, bill, confidence, reasons });
      }
    }
  }

  for (const order of orders) {
    if (matchedOrderIds.has(order.id)) continue;

    const matchingStatements = statements.filter((s) => {
      if (matchedStatementIds.has(s.id)) return false;
      const daysDiff = getDaysDiff(order.orderDate, s.transactionDate);
      return daysDiff <= 14;
    });

    for (const statement of matchingStatements) {
      const { confidence, reasons } = calculateConfidence(order, statement);
      if (confidence >= 50) {
        candidates.push({ order, statement, confidence, reasons });
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

export async function runAutoMatching(): Promise<MatchResult> {
  const [orders, statements, bills, existingMatchings] = await Promise.all([
    db.customerOrders.toArray(),
    db.bankStatements.toArray(),
    db.platformBills.toArray(),
    db.matchingRecords.toArray(),
  ]);

  const matchedOrderIds = new Set(existingMatchings.map((m) => m.orderId));
  const matchedStatementIds = new Set(existingMatchings.map((m) => m.statementId));

  const unmatchedOrders = orders.filter((o) => !matchedOrderIds.has(o.id));
  const unmatchedStatements = statements.filter((s) => !matchedStatementIds.has(s.id));

  const candidates = findMatchCandidates(unmatchedOrders, unmatchedStatements, bills);

  const result: MatchResult = {
    matched: 0,
    partial: 0,
    unmatched: 0,
    failed: 0,
    records: [],
  };

  const usedOrderIds = new Set<string>();
  const usedStatementIds = new Set<string>();

  for (const candidate of candidates) {
    if (usedOrderIds.has(candidate.order.id)) continue;
    if (usedStatementIds.has(candidate.statement.id)) continue;

    const isPartial = candidate.statement.receivedAmount < candidate.order.amount * 0.95;
    const matchStatus: MatchStatus = isPartial ? 'partial' : 'matched';

    const record: MatchingRecord = {
      id: crypto.randomUUID(),
      orderId: candidate.order.id,
      statementId: candidate.statement.id,
      billId: candidate.bill?.id,
      matchedAmount: candidate.statement.receivedAmount,
      receivedAmountCNY: candidate.statement.receivedAmount,
      status: matchStatus,
      confidence: candidate.confidence,
      isPartial,
      matchedAt: getNow(),
    };

    await db.matchingRecords.add(record);
    result.records.push(record);

    usedOrderIds.add(candidate.order.id);
    usedStatementIds.add(candidate.statement.id);

    if (isPartial) {
      result.partial++;
    } else {
      result.matched++;
    }
  }

  const remainingOrders = unmatchedOrders.filter((o) => !usedOrderIds.has(o.id));
  const remainingStatements = unmatchedStatements.filter((s) => !usedStatementIds.has(s.id));

  result.unmatched = remainingOrders.length + remainingStatements.length;

  return result;
}

export async function createManualMatch(
  orderId: string,
  statementId: string,
  billId?: string
): Promise<MatchingRecord> {
  const [order, statement] = await Promise.all([
    db.customerOrders.get(orderId),
    db.bankStatements.get(statementId),
  ]);

  if (!order || !statement) {
    throw new Error('订单或水单不存在');
  }

  const record: MatchingRecord = {
    id: crypto.randomUUID(),
    orderId,
    statementId,
    billId,
    matchedAmount: statement.receivedAmount,
    receivedAmountCNY: statement.receivedAmount,
    status: 'matched',
    confidence: 100,
    isPartial: statement.receivedAmount < order.amount * 0.95,
    matchedAt: getNow(),
  };

  await db.matchingRecords.add(record);
  return record;
}

export async function removeMatch(matchingId: string): Promise<void> {
  await db.matchingRecords.delete(matchingId);
  await db.exchangeLosses.where('matchingId').equals(matchingId).delete();
}

export async function getMatchingWithDetails(
  matchingId: string
): Promise<{
  matching: MatchingRecord;
  order: CustomerOrder;
  statement: BankStatement;
  bill?: PlatformBill;
} | null> {
  const matching = await db.matchingRecords.get(matchingId);
  if (!matching) return null;

  const [order, statement, bill] = await Promise.all([
    db.customerOrders.get(matching.orderId),
    db.bankStatements.get(matching.statementId),
    matching.billId ? db.platformBills.get(matching.billId) : Promise.resolve(undefined),
  ]);

  if (!order || !statement) return null;

  return { matching, order, statement, bill };
}
