export type RepaymentMethod = 'equal_principal_interest' | 'equal_principal';

export type PrepaymentType = 'partial' | 'full';

export type PartialOption = 'reduce_payment' | 'reduce_term';

export type PenaltyType = 'months_interest' | 'percentage' | 'fixed';

export type WarningLevel = 'info' | 'warning' | 'error';

export type WarningType = 'repricing_date' | 'term_change' | 'grace_period' | 'manual_check' | 'rate_adjustment';

export type ActionType = 'create' | 'update' | 'calculate' | 'correct';

export interface LoanBaseInfo {
  id: string;
  borrowerName?: string;
  loanAmount: number;
  loanTerm: number;
  interestRate: number;
  repaymentMethod: RepaymentMethod;
  disbursementDate: string;
  firstRepaymentDate: string;
  repricingDate: string;
  repricingCycle: number;
  contractNumber?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepaymentItem {
  period: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingPrincipal: number;
  status: 'pending' | 'paid' | 'overdue';
  source: string;
  isCorrected: boolean;
  correctionNote?: string;
  correctedAt?: string;
}

export interface RateAdjustment {
  id: string;
  effectiveDate: string;
  oldRate: number;
  newRate: number;
  basis: 'lpr' | 'fixed';
  spread?: number;
  source: string;
  note?: string;
  createdAt: string;
}

export interface PenaltyRule {
  type: PenaltyType;
  value: number;
  freePeriod: number;
  minAmount?: number;
  maxAmount?: number;
  specialClauses?: string;
  source: string;
}

export interface PrepaymentParams {
  prepaymentDate: string;
  prepaymentAmount: number;
  prepaymentType: PrepaymentType;
  partialOption?: PartialOption;
  gracePeriod?: number;
}

export interface WarningItem {
  level: WarningLevel;
  type: WarningType;
  message: string;
  details: string;
}

export interface PrepaymentResult {
  id: string;
  params: PrepaymentParams;
  originalTotalInterest: number;
  originalTotalPayment: number;
  newTotalInterest: number;
  newTotalPayment: number;
  interestSaved: number;
  penaltyAmount: number;
  netBenefit: number;
  newMonthlyPayment?: number;
  newTerm?: number;
  originalRemainingTerm: number;
  remainingPrincipal: number;
  periodAtPrepayment: number;
  warnings: WarningItem[];
  newRepaymentSchedule: RepaymentItem[];
  source: string;
  createdAt: string;
  name?: string;
}

export interface HistoryRecord {
  id: string;
  loanId: string;
  timestamp: string;
  action: ActionType;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  operatorNote?: string;
  source?: string;
}

export interface ComparisonScheme {
  id: string;
  resultId: string;
  name: string;
  color: string;
}

export interface AppState {
  loanInfo: LoanBaseInfo | null;
  repaymentSchedule: RepaymentItem[];
  rateAdjustments: RateAdjustment[];
  penaltyRule: PenaltyRule | null;
  prepaymentResults: PrepaymentResult[];
  historyRecords: HistoryRecord[];
  comparisonSchemes: ComparisonScheme[];
  activeResultId: string | null;
}
