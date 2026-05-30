import type { Order, QuotaLimit, RiskJudgment, RiskType, Settlement, SettlementItem, QuotaLockRecord } from "../types";
import { RISK_SCORES } from "../types";

export function checkQuotaOverrun(order: Order, quotas: QuotaLimit[]): { overrun: boolean; currencyPair: string; overAmount: number; newUsed: number; totalLimit: number } | null {
  if (!order.amount) return null;
  const quota = quotas.find((q) => q.currencyPair === order.currencyPair);
  if (!quota) return null;
  const newUsed = quota.usedAmount + order.amount;
  if (newUsed > quota.totalLimit) {
    return {
      overrun: true,
      currencyPair: order.currencyPair,
      overAmount: newUsed - quota.totalLimit,
      newUsed,
      totalLimit: quota.totalLimit,
    };
  }
  return null;
}

export function checkDuplicateOrder(order: Order, allOrders: Order[]): { isDuplicate: boolean; originalId: string } | null {
  if (!order.amount) return null;
  const duplicate = allOrders.find(
    (o) =>
      o.id !== order.id &&
      o.clientName === order.clientName &&
      o.currencyPair === order.currencyPair &&
      o.direction === order.direction &&
      o.amount === order.amount &&
      o.price === order.price
  );
  if (duplicate) {
    return { isDuplicate: true, originalId: duplicate.id };
  }
  return null;
}

export function checkMissingStopLoss(order: Order): boolean {
  return order.stopLoss === null;
}

export function checkMissingFields(order: Order): string[] {
  const missing: string[] = [];
  if (order.amount === null) missing.push("金额(amount)");
  if (order.stopLoss === null) missing.push("止损(stopLoss)");
  return missing;
}

export function generateQuotaLockRecords(orders: Order[], quotas: QuotaLimit[]): QuotaLockRecord[] {
  const records: QuotaLockRecord[] = [];
  const simulatedUsed: Record<string, number> = {};
  quotas.forEach((q) => {
    simulatedUsed[q.currencyPair] = q.usedAmount;
  });

  for (const order of orders) {
    if (!order.amount) continue;
    const quota = quotas.find((q) => q.currencyPair === order.currencyPair);
    if (!quota) continue;
    simulatedUsed[quota.currencyPair] += order.amount;
    if (simulatedUsed[quota.currencyPair] > quota.totalLimit) {
      const overAmount = simulatedUsed[quota.currencyPair] - quota.totalLimit;
      const existing = records.find((r) => r.currencyPair === quota.currencyPair);
      if (existing) {
        existing.involvedOrders.push(order.id);
        existing.overAmount = overAmount;
        existing.reason = `${quota.currencyPair} 已用 ${simulatedUsed[quota.currencyPair].toLocaleString()} / 总额 ${quota.totalLimit.toLocaleString()}，超限 ${overAmount.toLocaleString()}`;
        existing.unlockCondition = `追加额度 ${overAmount.toLocaleString()} 或撤销涉及订单`;
      } else {
        records.push({
          id: `QL-${quota.currencyPair}-${Date.now()}`,
          currencyPair: quota.currencyPair,
          lockedAt: Date.now(),
          reason: `${quota.currencyPair} 已用 ${simulatedUsed[quota.currencyPair].toLocaleString()} / 总额 ${quota.totalLimit.toLocaleString()}，超限 ${overAmount.toLocaleString()}`,
          involvedOrders: [order.id],
          overAmount,
          unlockCondition: `追加额度 ${overAmount.toLocaleString()} 或撤销涉及订单`,
        });
      }
    }
  }
  return records;
}

export function calculateSettlement(
  levelId: string,
  orders: Order[],
  quotas: QuotaLimit[],
  userMarkedRisks: Record<string, RiskType[]>,
  expectedRisks: RiskJudgment[]
): Settlement {
  const items: SettlementItem[] = [];
  let totalScore = 0;
  let deductions = 0;
  let quotaLockCount = 0;
  let riskAlertHitCount = 0;

  const lockRecords = generateQuotaLockRecords(orders, quotas);
  quotaLockCount = lockRecords.length;

  const processedKeys = new Set<string>();

  for (const expected of expectedRisks) {
    const key = `${expected.orderId}-${expected.riskType}`;
    processedKeys.add(key);

    const userMarked = userMarkedRisks[expected.orderId]?.includes(expected.riskType) ?? false;
    const scores = RISK_SCORES[expected.riskType];

    if (userMarked) {
      const item: SettlementItem = {
        orderId: expected.orderId,
        riskType: expected.riskType,
        earned: scores.correct,
        deducted: 0,
        userCorrect: true,
        detail: expected.correctionSuggestion,
      };
      items.push(item);
      totalScore += scores.correct;
      riskAlertHitCount++;
    } else {
      const item: SettlementItem = {
        orderId: expected.orderId,
        riskType: expected.riskType,
        earned: 0,
        deducted: Math.abs(scores.miss),
        userCorrect: false,
        detail: expected.correctionSuggestion,
      };
      items.push(item);
      deductions += Math.abs(scores.miss);
    }
  }

  for (const orderId of Object.keys(userMarkedRisks)) {
    for (const riskType of userMarkedRisks[orderId]) {
      const key = `${orderId}-${riskType}`;
      if (processedKeys.has(key)) continue;

      const scores = RISK_SCORES[riskType];
      const item: SettlementItem = {
        orderId,
        riskType,
        earned: 0,
        deducted: 5,
        userCorrect: false,
        detail: `误判：订单 ${orderId} 不存在${riskType === "quota_overrun" ? "额度超限" : riskType === "duplicate_order" ? "重复下单" : riskType === "missing_stoploss" ? "止损漏设" : "缺字段"}风险`,
      };
      items.push(item);
      deductions += 5;
    }
  }

  totalScore = Math.max(0, totalScore - deductions);
  const quotaLockDeduction = quotaLockCount * 5;

  return {
    id: `STL-${levelId}-${Date.now()}`,
    levelId,
    totalScore: Math.max(0, totalScore - quotaLockDeduction),
    deductions: deductions + quotaLockDeduction,
    quotaLockCount,
    riskAlertHitCount,
    createdAt: Date.now(),
    items,
  };
}

export function generateCorrectionSuggestions(order: Order, allOrders: Order[], quotas: QuotaLimit[]): { riskType: RiskType; suggestion: string }[] {
  const suggestions: { riskType: RiskType; suggestion: string }[] = [];

  const overrun = checkQuotaOverrun(order, quotas);
  if (overrun) {
    suggestions.push({
      riskType: "quota_overrun",
      suggestion: `${overrun.currencyPair} 已用 ${overrun.newUsed.toLocaleString()} / 总额 ${overrun.totalLimit.toLocaleString()}，超限 ${overrun.overAmount.toLocaleString()}。明确结论：额度超限。建议追加额度或拆单`,
    });
  }

  const dup = checkDuplicateOrder(order, allOrders);
  if (dup) {
    suggestions.push({
      riskType: "duplicate_order",
      suggestion: `${order.id} 与 ${dup.originalId} 为重复下单（客户、货币对、方向、金额、价格均相同）。建议撤销重复订单 ${order.id}，保留原始订单 ${dup.originalId}`,
    });
  }

  if (checkMissingStopLoss(order)) {
    const suggestedStop = order.direction === "买入"
      ? (order.price * 0.995).toFixed(4)
      : (order.price * 1.005).toFixed(4);
    suggestions.push({
      riskType: "missing_stoploss",
      suggestion: `建议设置止损位 ${suggestedStop}（基于${order.currencyPair}近期波动率计算，约1个标准差）`,
    });
  }

  const missing = checkMissingFields(order).filter((f) => f !== "止损(stopLoss)");
  if (missing.length > 0) {
    suggestions.push({
      riskType: "missing_field",
      suggestion: `建议补全字段：${missing.join("、")}`,
    });
  }

  return suggestions;
}
