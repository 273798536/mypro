import type { LoanBaseInfo, RateAdjustment, PenaltyRule } from '@/types';
import { generateId } from '@/utils/calculator';

export const sampleLoanInfo: LoanBaseInfo = {
  id: generateId(),
  borrowerName: '张三',
  loanAmount: 1500000,
  loanTerm: 360,
  interestRate: 4.9,
  repaymentMethod: 'equal_principal_interest',
  disbursementDate: '2020-05-10',
  firstRepaymentDate: '2020-06-10',
  repricingDate: '2026-01-01',
  repricingCycle: 12,
  contractNumber: 'GD20200510001',
  source: '贷款合同原件',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const sampleRateAdjustments: RateAdjustment[] = [
  {
    id: generateId(),
    effectiveDate: '2022-01-01',
    oldRate: 4.9,
    newRate: 4.6,
    basis: 'lpr',
    spread: -30,
    source: 'LPR报价公告',
    note: '5年期LPR下调至4.6%',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    effectiveDate: '2023-01-01',
    oldRate: 4.6,
    newRate: 4.3,
    basis: 'lpr',
    spread: -30,
    source: 'LPR报价公告',
    note: '5年期LPR下调至4.3%',
    createdAt: new Date().toISOString(),
  },
];

export const samplePenaltyRule: PenaltyRule = {
  type: 'months_interest',
  value: 3,
  freePeriod: 36,
  minAmount: 1000,
  maxAmount: 50000,
  specialClauses: '部分提前还款每年仅限1次，每次最低还款金额不少于5万元',
  source: '贷款合同第8.2条',
};
