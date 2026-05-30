export type RiskType = "quota_overrun" | "duplicate_order" | "missing_stoploss" | "missing_field";

export type LevelStatus = "locked" | "pending" | "in_progress" | "completed";

export interface Order {
  id: string;
  clientName: string;
  currencyPair: string;
  direction: "买入" | "卖出";
  amount: number | null;
  price: number;
  stopLoss: number | null;
  remark: string;
  missingFields: string[];
  duplicateOf: string | null;
  modifiedFrom: string | null;
}

export interface QuotaLimit {
  currencyPair: string;
  totalLimit: number;
  usedAmount: number;
  isLocked: boolean;
  lockedAt: number | null;
  lockReason: string;
}

export interface RiskJudgment {
  orderId: string;
  riskType: RiskType;
  userMarked: boolean;
  isCorrect: boolean;
  correctionSuggestion: string;
}

export interface QuotaLockRecord {
  id: string;
  currencyPair: string;
  lockedAt: number;
  reason: string;
  involvedOrders: string[];
  overAmount: number;
  unlockCondition: string;
}

export interface Settlement {
  id: string;
  levelId: string;
  totalScore: number;
  deductions: number;
  quotaLockCount: number;
  riskAlertHitCount: number;
  createdAt: number;
  items: SettlementItem[];
}

export interface SettlementItem {
  orderId: string;
  riskType: RiskType;
  earned: number;
  deducted: number;
  userCorrect: boolean;
  detail: string;
}

export interface ChangeRecord {
  id: string;
  orderId: string;
  field: string;
  oldValue: string;
  newValue: string;
  oldSettlementId: string;
  newSettlementId: string;
  timestamp: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  orders: Order[];
  quotas: QuotaLimit[];
  quotaLoadDelay: number;
  expectedRisks: RiskJudgment[];
}

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  quota_overrun: "额度超限",
  duplicate_order: "重复下单",
  missing_stoploss: "止损漏设",
  missing_field: "缺字段",
};

export const RISK_SCORES: Record<RiskType, { correct: number; miss: number }> = {
  quota_overrun: { correct: 20, miss: -15 },
  duplicate_order: { correct: 20, miss: -15 },
  missing_stoploss: { correct: 15, miss: -10 },
  missing_field: { correct: 10, miss: -5 },
};
