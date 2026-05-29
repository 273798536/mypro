export type TxStatus = 'normal' | 'anomaly' | 'revised' | 'pending_review';

export type AnomalyType = 
  | 'refund_not_rolledback'
  | 'subsidy_cross_campaign'
  | 'points_rate_overlap'
  | 'manual_review_needed';

export type DataSource = 'card_transaction' | 'point_rule' | 'merchant_subsidy' | 'refund_record' | 'redemption_record' | 'cost_report';

export interface Transaction {
  id: string;
  cardNo: string;
  amount: number;
  txTime: string;
  merchantId: string;
  merchantName: string;
  campaignId: string | null;
  campaignName?: string;
  pointsEarned: number;
  source: DataSource;
  sourceRef: string;
  status: TxStatus;
  anomalies: AnomalyType[];
  anomalyNotes?: string;
  revisionHistory: Revision[];
  pointsCost?: number;
  subsidyCost?: number;
  totalCost?: number;
}

export interface Campaign {
  id: string;
  name: string;
  version: string;
  startDate: string;
  endDate: string;
  pointRate: number;
  subsidyRate: number;
  subsidyCap: number;
  rules: CampaignRule[];
  isActive: boolean;
  description: string;
  createdAt: string;
}

export interface CampaignRule {
  id: string;
  type: 'points_multiplier' | 'merchant_include' | 'merchant_exclude' | 'amount_threshold';
  value: number | string[];
  condition?: string;
}

export interface Refund {
  id: string;
  originalTxId: string;
  refundAmount: number;
  refundTime: string;
  pointsRolledBack: boolean;
  pointsToRollback: number;
  actualPointsRolledBack: number;
  status: 'pending' | 'processed' | 'discrepancy';
  notes?: string;
}

export interface Subsidy {
  id: string;
  merchantId: string;
  merchantName: string;
  campaignId: string;
  rate: number;
  capAmount: number;
  effectiveDate: string;
  expiryDate: string;
  isActive: boolean;
}

export interface Revision {
  id: string;
  txId: string;
  field: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
  timestamp: string;
  operator: string;
}

export interface CostStats {
  totalTransactions: number;
  totalAmount: number;
  totalPoints: number;
  totalPointsCost: number;
  totalSubsidyCost: number;
  totalCost: number;
  unhandledCount: number;
  revisedCount: number;
  pendingReviewCount: number;
  anomalyCount: number;
  anomalyBreakdown: Record<AnomalyType, number>;
  costByCampaign: { campaignId: string; campaignName: string; cost: number; count: number }[];
  costByMerchant: { merchantId: string; merchantName: string; cost: number; count: number }[];
  dailyCost: { date: string; pointsCost: number; subsidyCost: number }[];
}

export interface FilterOptions {
  dateRange: { start: string; end: string } | null;
  merchantIds: string[];
  campaignIds: string[];
  statuses: TxStatus[];
  anomalyTypes: AnomalyType[];
  searchTerm: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeUnhandled: boolean;
  includeRevised: boolean;
  includePendingReview: boolean;
  includeAnomalies: boolean;
}
