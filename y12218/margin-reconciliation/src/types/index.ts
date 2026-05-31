export type PositionDirection = 'long' | 'short';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReconciliationStatus = 'pending' | 'matched' | 'mismatch' | 'manual';

export type FundFlowType = 'deposit' | 'withdraw' | 'freeze' | 'unfreeze';

export type FundFlowStatus = 'pending' | 'completed' | 'failed';

export type VersionSource = 'day' | 'night_v1' | 'night_v2' | 'final';

export interface Customer {
  id: string;
  name: string;
  customerId: string;
  riskLevel: RiskLevel;
}

export interface PositionVersion {
  version: number;
  timestamp: string;
  marginRate: number;
  marginAmount: number;
  remark?: string;
  source: VersionSource;
}

export interface Position {
  id: string;
  customerId: string;
  contractCode: string;
  direction: PositionDirection;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marginRate: number;
  marginAmount: number;
  versions: PositionVersion[];
  remark?: string;
  lastUpdated: string;
  versionSource: VersionSource;
  hasNightJump: boolean;
  nightJumpAmount?: number;
}

export interface Trade {
  id: string;
  customerId: string;
  contractCode: string;
  direction: PositionDirection;
  quantity: number;
  price: number;
  marginRate: number;
  marginAmount: number;
  tradeTime: string;
  versionSource: VersionSource;
}

export interface FundFlow {
  id: string;
  customerId: string;
  type: FundFlowType;
  amount: number;
  status: FundFlowStatus;
  timestamp: string;
  remark?: string;
  relatedTradeId?: string;
  versionSource: VersionSource;
  overridden?: boolean;
  originalAmount?: number;
}

export interface NightMarketData {
  id: string;
  contractCode: string;
  tradeDate: string;
  version: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  settlementPrice: number;
  prevSettlementPrice: number;
  priceJump: number;
  jumpPercentage: number;
  hasJump: boolean;
  timestamp: string;
  source: VersionSource;
}

export interface MarginRateChange {
  id: string;
  contractCode: string;
  effectiveTime: string;
  oldRate: number;
  newRate: number;
  reason: string;
  versionSource: VersionSource;
}

export interface MarginCalculationResult {
  id: string;
  customerId: string;
  customerName: string;
  tradeDate: string;
  positionMargin: number;
  tradeMargin: number;
  totalRequiredMargin: number;
  actualMargin: number;
  availableFund: number;
  frozenFund: number;
  marginDifference: number;
  status: ReconciliationStatus;
  riskLevel: RiskLevel;
  positionIds: string[];
  tradeIds: string[];
  fundFlowIds: string[];
  evidence: EvidenceItem[];
  hasNightJump: boolean;
  hasMarginRateChange: boolean;
  hasOverriddenFundFlow: boolean;
  calculatedAt: string;
  versionSource: VersionSource;
}

export interface EvidenceItem {
  type: 'position' | 'trade' | 'fund' | 'night_market' | 'margin_rate';
  id: string;
  description: string;
  amount?: number;
  timestamp: string;
  versionSource: VersionSource;
  isCritical: boolean;
}

export interface ReconciliationSummary {
  totalCustomers: number;
  matchedCount: number;
  mismatchCount: number;
  pendingCount: number;
  manualCount: number;
  totalMargin: number;
  totalDifference: number;
  riskBreakdown: Record<RiskLevel, number>;
}

export interface ImportSample {
  id: string;
  name: string;
  description: string;
  scenario: 'normal' | 'night_jump' | 'margin_change' | 'fund_freeze' | 'mixed';
  file?: File;
  importedAt?: string;
}
