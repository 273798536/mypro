export type EstimationStatus =
  | 'draft'
  | 'pending_review'
  | 'reviewed'
  | 'confirmed'
  | 'completed';

export type FeeType = 'management' | 'performance' | 'custody' | 'audit' | 'other';

export interface SidePocket {
  id: string;
  fundId: string;
  fundName: string;
  sidePocketAssetName: string;
  sidePocketNav: number;
  totalShares: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorShare {
  id: string;
  sidePocketId: string;
  investorId: string;
  investorName: string;
  originalShares: number;
  sidePocketShares: number;
  sidePocketNav: number;
  redemptionFrozen: boolean;
  frozenRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeRule {
  id: string;
  sidePocketId: string;
  feeType: FeeType;
  feeRate: number;
  feeBase: 'nav' | 'shares';
  description: string;
  createdAt: string;
}

export interface FeeDeduction {
  id: string;
  sidePocketId: string;
  investorShareId: string;
  feeRuleId: string;
  valuationVersionId: string;
  feeAmount: number;
  deductedShares: number;
  createdAt: string;
}

export interface ValuationVersion {
  id: string;
  sidePocketId: string;
  version: number;
  nav: number;
  valuationDate: string;
  valuationDelayDays: number;
  delayReason: string;
  createdAt: string;
}

export interface RedemptionFreeze {
  id: string;
  sidePocketId: string;
  investorShareId: string;
  freezeDate: string;
  unfreezeDate: string | null;
  frozenShares: number;
  reason: string;
  sourceRecordId: string;
  createdAt: string;
}

export interface EstimationRecord {
  id: string;
  sidePocketId: string;
  fundId: string;
  fundName: string;
  sidePocketAssetName: string;
  status: EstimationStatus;
  valuationVersionId: string;
  investorShares: InvestorShare[];
  feeDeductions: FeeDeduction[];
  summary: EstimationSummary;
  reviewer: string | null;
  reviewedAt: string | null;
  confirmNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstimationSummary {
  totalSidePocketShares: number;
  totalSidePocketNav: number;
  totalFeeDeducted: number;
  valuationDelayDays: number;
  delayReason: string;
  frozenShareCount: number;
  frozenShareTotal: number;
  investorCount: number;
  feeDeductionCount: number;
  duplicateFeeWarnings: DuplicateFeeWarning[];
}

export interface DuplicateFeeWarning {
  investorShareId: string;
  investorName: string;
  feeType: FeeType;
  feeRuleId: string;
  occurrences: number;
  totalAmount: number;
}

export interface CreateEstimationInput {
  fundId: string;
  fundName: string;
  sidePocketAssetName: string;
  sidePocketNav: number;
  investorShares: {
    investorId: string;
    investorName: string;
    originalShares: number;
    sidePocketShares: number;
  }[];
  feeRules: {
    feeType: FeeType;
    feeRate: number;
    feeBase: 'nav' | 'shares';
    description: string;
  }[];
  valuationDate: string;
  valuationDelayDays: number;
  delayReason: string;
}

export interface ReviewEstimationInput {
  reviewer: string;
}

export interface AdvanceStatusInput {
  note?: string;
}
