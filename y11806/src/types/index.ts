export interface SettlementPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  settlementDate: string;
  status: 'pending' | 'processing' | 'completed';
  totalOrders: number;
  totalAmount: number;
  platformFee: number;
  adFee: number;
  refundAmount: number;
  netAmount: number;
}

export interface ShopOrder {
  id: string;
  orderNo: string;
  periodId: string;
  shopName: string;
  orderAmount: number;
  platformFee: number;
  adFee: number;
  refundAmount: number;
  conclusion: string;
  conclusionChanged: boolean;
  lastModified: string;
}

export interface CashFlowForecast {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  warning: boolean;
  warningReason?: string;
}

export interface PendingItem {
  id: string;
  type: 'deduction' | 'delay' | 'refund';
  description: string;
  amount: number;
  relatedPeriod: string;
  createdAt: string;
  status: 'pending' | 'confirmed';
}

export interface AdFeeRecord {
  id: string;
  periodId: string;
  campaignName: string;
  amount: number;
  recordedAt: string;
  operator: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface FeeBreakdown {
  platformFee: number;
  adFee: number;
  platformFeeRatio: number;
  adFeeRatio: number;
  explanation: string;
}
