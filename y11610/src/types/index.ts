export type Currency = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'JPY' | 'HKD' | 'AUD' | 'CAD';

export type MatchStatus = 'matched' | 'partial' | 'unmatched' | 'pending';

export type LossType = 'normal' | 'fee' | 'rate' | 'partial';

export type AnomalyType = 'none' | 'rate_date_mismatch' | 'partial_receipt' | 'fee_deducted' | 'duplicate' | 'rate_abnormal';

export type LossStatus = 'pending' | 'confirmed' | 'adjusted' | 'ignored';

export type ImportType = 'order' | 'statement' | 'bill' | 'rate';

export interface CustomerOrder {
  id: string;
  orderNo: string;
  customerName: string;
  currency: Currency;
  amount: number;
  orderDate: string;
  source: string;
  createdAt: string;
}

export interface BankStatement {
  id: string;
  referenceNo: string;
  transactionDate: string;
  currency: Currency;
  receivedAmount: number;
  bank: string;
  payerInfo: string;
  source: string;
  createdAt: string;
}

export interface PlatformBill {
  id: string;
  billNo: string;
  platform: string;
  billDate: string;
  currency: Currency;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  orderNo: string;
  source: string;
  createdAt: string;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: Currency;
  targetCurrency: Currency;
  rate: number;
  date: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchingRecord {
  id: string;
  orderId: string;
  statementId: string;
  billId?: string;
  matchedAmount: number;
  receivedAmountCNY: number;
  status: MatchStatus;
  confidence: number;
  isPartial: boolean;
  matchedAt: string;
}

export interface ExchangeLoss {
  id: string;
  matchingId: string;
  orderId: string;
  rateId: string;
  expectedAmount: number;
  actualAmount: number;
  lossAmount: number;
  lossRate: number;
  lossType: LossType;
  anomalyType: AnomalyType;
  anomalyDescription: string;
  calculationDate: string;
  status: LossStatus;
}

export interface AuditLog {
  id: string;
  lossId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  remark: string;
}

export interface ImportPreview {
  type: ImportType;
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  duplicates: number;
  errors: string[];
}

export interface DashboardStats {
  totalReceipts: number;
  totalLoss: number;
  anomalyCount: number;
  pendingCount: number;
  lossTrend: { date: string; amount: number }[];
  currencyDistribution: { currency: string; amount: number }[];
  anomalyDistribution: { type: string; count: number }[];
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  none: '正常',
  rate_date_mismatch: '汇率日期不匹配',
  partial_receipt: '部分到账',
  fee_deducted: '手续费内扣',
  duplicate: '重复导入',
  rate_abnormal: '汇率异常波动',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  matched: '已匹配',
  partial: '部分匹配',
  unmatched: '未匹配',
  pending: '待确认',
};

export const LOSS_TYPE_LABELS: Record<LossType, string> = {
  normal: '正常汇损',
  fee: '手续费导致',
  rate: '汇率波动',
  partial: '部分到账',
};

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  order: '客户订单',
  statement: '银行水单',
  bill: '平台账单',
  rate: '汇率数据',
};

export const LOSS_STATUS_LABELS: Record<LossStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  adjusted: '已调整',
  ignored: '已忽略',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  CNY: '¥',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  AUD: 'A$',
  CAD: 'C$',
};
