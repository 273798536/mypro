import { addMonths, differenceInDays, differenceInMonths, format, isAfter, isBefore, parseISO } from 'date-fns';
import type {
  LoanBaseInfo,
  PenaltyRule,
  PrepaymentParams,
  PrepaymentResult,
  RateAdjustment,
  RepaymentItem,
  WarningItem,
} from '@/types';

export function calculateEqualPrincipalInterest(
  principal: number,
  annualRate: number,
  months: number,
  startDate: string
): RepaymentItem[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  
  const schedule: RepaymentItem[] = [];
  let remainingPrincipal = principal;
  
  for (let i = 0; i < months; i++) {
    const interest = remainingPrincipal * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    remainingPrincipal -= principalPayment;
    
    schedule.push({
      period: i + 1,
      dueDate: format(addMonths(parseISO(startDate), i), 'yyyy-MM-dd'),
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      totalPayment: Math.round(monthlyPayment * 100) / 100,
      remainingPrincipal: Math.round(Math.max(0, remainingPrincipal) * 100) / 100,
      status: 'pending',
      source: '系统生成',
      isCorrected: false,
    });
  }
  
  return schedule;
}

export function calculateEqualPrincipal(
  principal: number,
  annualRate: number,
  months: number,
  startDate: string
): RepaymentItem[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPrincipal = principal / months;
  
  const schedule: RepaymentItem[] = [];
  let remainingPrincipal = principal;
  
  for (let i = 0; i < months; i++) {
    const interest = remainingPrincipal * monthlyRate;
    const totalPayment = monthlyPrincipal + interest;
    remainingPrincipal -= monthlyPrincipal;
    
    schedule.push({
      period: i + 1,
      dueDate: format(addMonths(parseISO(startDate), i), 'yyyy-MM-dd'),
      principal: Math.round(monthlyPrincipal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      remainingPrincipal: Math.round(Math.max(0, remainingPrincipal) * 100) / 100,
      status: 'pending',
      source: '系统生成',
      isCorrected: false,
    });
  }
  
  return schedule;
}

export function generateRepaymentSchedule(
  loanInfo: LoanBaseInfo,
  rateAdjustments: RateAdjustment[] = []
): RepaymentItem[] {
  if (rateAdjustments.length === 0) {
    return loanInfo.repaymentMethod === 'equal_principal_interest'
      ? calculateEqualPrincipalInterest(
          loanInfo.loanAmount,
          loanInfo.interestRate,
          loanInfo.loanTerm,
          loanInfo.firstRepaymentDate
        )
      : calculateEqualPrincipal(
          loanInfo.loanAmount,
          loanInfo.interestRate,
          loanInfo.loanTerm,
          loanInfo.firstRepaymentDate
        );
  }
  
  const sortedAdjustments = [...rateAdjustments].sort((a, b) => 
    parseISO(a.effectiveDate).getTime() - parseISO(b.effectiveDate).getTime()
  );
  
  const fullSchedule: RepaymentItem[] = [];
  let currentPrincipal = loanInfo.loanAmount;
  let currentRate = loanInfo.interestRate;
  let currentDate = loanInfo.firstRepaymentDate;
  let remainingMonths = loanInfo.loanTerm;
  let periodCounter = 0;
  
  for (const adjustment of sortedAdjustments) {
    const monthsUntilAdjustment = Math.max(0, differenceInMonths(parseISO(adjustment.effectiveDate), parseISO(currentDate)));
    
    if (monthsUntilAdjustment > 0 && remainingMonths > 0) {
      const segmentMonths = Math.min(monthsUntilAdjustment, remainingMonths);
      const segmentSchedule = loanInfo.repaymentMethod === 'equal_principal_interest'
        ? calculateEqualPrincipalInterest(currentPrincipal, currentRate, segmentMonths, currentDate)
        : calculateEqualPrincipal(currentPrincipal, currentRate, segmentMonths, currentDate);
      
      segmentSchedule.forEach(item => {
        item.period = ++periodCounter;
      });
      
      fullSchedule.push(...segmentSchedule);
      currentPrincipal = segmentSchedule[segmentSchedule.length - 1].remainingPrincipal;
      remainingMonths -= segmentMonths;
      currentDate = segmentSchedule[segmentSchedule.length - 1].dueDate;
    }
    
    currentRate = adjustment.newRate;
  }
  
  if (remainingMonths > 0) {
    const finalSchedule = loanInfo.repaymentMethod === 'equal_principal_interest'
      ? calculateEqualPrincipalInterest(currentPrincipal, currentRate, remainingMonths, currentDate)
      : calculateEqualPrincipal(currentPrincipal, currentRate, remainingMonths, currentDate);
    
    finalSchedule.forEach(item => {
      item.period = ++periodCounter;
    });
    
    fullSchedule.push(...finalSchedule);
  }
  
  return fullSchedule;
}

export function calculatePenalty(
  remainingPrincipal: number,
  currentMonthlyInterest: number,
  penaltyRule: PenaltyRule,
  loanInfo: LoanBaseInfo,
  prepaymentDate: string
): { amount: number; waived: boolean; reason?: string } {
  const monthsSinceDisbursement = differenceInMonths(parseISO(prepaymentDate), parseISO(loanInfo.disbursementDate));
  
  if (monthsSinceDisbursement < penaltyRule.freePeriod) {
    return { amount: 0, waived: false };
  }
  
  let penaltyAmount = 0;
  
  switch (penaltyRule.type) {
    case 'months_interest':
      penaltyAmount = currentMonthlyInterest * penaltyRule.value;
      break;
    case 'percentage':
      penaltyAmount = remainingPrincipal * (penaltyRule.value / 100);
      break;
    case 'fixed':
      penaltyAmount = penaltyRule.value;
      break;
  }
  
  if (penaltyRule.minAmount && penaltyAmount < penaltyRule.minAmount) {
    penaltyAmount = penaltyRule.minAmount;
  }
  if (penaltyRule.maxAmount && penaltyAmount > penaltyRule.maxAmount) {
    penaltyAmount = penaltyRule.maxAmount;
  }
  
  return { amount: Math.round(penaltyAmount * 100) / 100, waived: false };
}

export function findPeriodAtDate(schedule: RepaymentItem[], date: string): number {
  const targetDate = parseISO(date);
  for (let i = 0; i < schedule.length; i++) {
    if (isAfter(targetDate, parseISO(schedule[i].dueDate)) || 
        schedule[i].dueDate === date) {
      continue;
    }
    return Math.max(1, i);
  }
  return schedule.length;
}

export function getRateAtDate(
  loanInfo: LoanBaseInfo,
  rateAdjustments: RateAdjustment[],
  date: string
): number {
  const targetDate = parseISO(date);
  let currentRate = loanInfo.interestRate;
  
  const sortedAdjustments = [...rateAdjustments].sort((a, b) => 
    parseISO(a.effectiveDate).getTime() - parseISO(b.effectiveDate).getTime()
  );
  
  for (const adjustment of sortedAdjustments) {
    if (!isAfter(parseISO(adjustment.effectiveDate), targetDate)) {
      currentRate = adjustment.newRate;
    }
  }
  
  return currentRate;
}

export function generateWarnings(
  loanInfo: LoanBaseInfo,
  prepaymentParams: PrepaymentParams,
  schedule: RepaymentItem[],
  rateAdjustments: RateAdjustment[],
  periodAtPrepayment: number,
  originalTerm: number,
  newTerm?: number
): WarningItem[] {
  const warnings: WarningItem[] = [];
  const prepaymentDate = parseISO(prepaymentParams.prepaymentDate);
  
  const repricingDate = parseISO(loanInfo.repricingDate);
  const daysToRepricing = differenceInDays(repricingDate, prepaymentDate);
  if (Math.abs(daysToRepricing) <= 30) {
    warnings.push({
      level: 'warning',
      type: 'repricing_date',
      message: '临近利率重定价日',
      details: `提前还款日距离重定价日仅 ${Math.abs(daysToRepricing)} 天，建议考虑重定价后利率变化的影响，重定价日为 ${format(repricingDate, 'yyyy-MM-dd')}。`,
    });
  }
  
  if (prepaymentParams.prepaymentType === 'partial' && prepaymentParams.partialOption === 'reduce_term' && newTerm) {
    const termReduction = originalTerm - periodAtPrepayment - newTerm;
    if (termReduction > originalTerm * 0.1) {
      warnings.push({
        level: 'info',
        type: 'term_change',
        message: '还款期限大幅缩短',
        details: `提前还款后还款期限将缩短 ${termReduction} 期（约 ${Math.round(termReduction / 12 * 10) / 10} 年），请确认客户是否接受新的月供金额。`,
      });
    }
  }
  
  if (prepaymentParams.gracePeriod && prepaymentParams.gracePeriod > 0) {
    const dueDateAtPeriod = parseISO(schedule[periodAtPrepayment - 1]?.dueDate || prepaymentParams.prepaymentDate);
    const daysInGrace = differenceInDays(prepaymentDate, dueDateAtPeriod);
    if (daysInGrace > 0 && daysInGrace <= prepaymentParams.gracePeriod) {
      warnings.push({
        level: 'warning',
        type: 'grace_period',
        message: '处于还款宽限期内',
        details: `当前处于 ${prepaymentParams.gracePeriod} 天宽限期内（已逾期 ${daysInGrace} 天），可能产生额外罚息，请与柜台确认实际应还金额。`,
      });
    }
  }
  
  for (const adj of rateAdjustments) {
    const adjDate = parseISO(adj.effectiveDate);
    const daysDiff = differenceInDays(adjDate, prepaymentDate);
    if (Math.abs(daysDiff) <= 60) {
      warnings.push({
        level: 'info',
        type: 'rate_adjustment',
        message: '近期有利率调整',
        details: `在 ${format(adjDate, 'yyyy-MM-dd')} 有利率调整（从 ${adj.oldRate}% 调整为 ${adj.newRate}%），距提前还款日 ${Math.abs(daysDiff)} 天。`,
      });
    }
  }
  
  if (prepaymentParams.prepaymentType === 'partial' && !prepaymentParams.partialOption) {
    warnings.push({
      level: 'error',
      type: 'manual_check',
      message: '需选择部分还款方式',
      details: '部分提前还款需要客户明确选择"减少月供"或"缩短期限"，请与客户确认后重新计算。',
    });
  }
  
  const periodItem = schedule[periodAtPrepayment - 1];
  if (periodItem && periodItem.isCorrected) {
    warnings.push({
      level: 'info',
      type: 'manual_check',
      message: '当前期数存在人工修正',
      details: `第 ${periodAtPrepayment} 期还款计划已被人工修正（${periodItem.correctionNote || '无备注'}），计算结果可能与系统自动生成有差异。`,
    });
  }
  
  return warnings;
}

export function calculatePrepayment(
  loanInfo: LoanBaseInfo,
  schedule: RepaymentItem[],
  rateAdjustments: RateAdjustment[],
  penaltyRule: PenaltyRule | null,
  params: PrepaymentParams
): PrepaymentResult {
  const periodAtPrepayment = findPeriodAtDate(schedule, params.prepaymentDate);
  const currentItem = schedule[periodAtPrepayment - 1];
  const remainingPrincipal = currentItem?.remainingPrincipal || schedule[schedule.length - 1]?.remainingPrincipal || 0;
  const currentRate = getRateAtDate(loanInfo, rateAdjustments, params.prepaymentDate);
  
  const originalTotalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
  const originalTotalPayment = schedule.reduce((sum, item) => sum + item.totalPayment, 0);
  const interestPaidBefore = schedule.slice(0, periodAtPrepayment - 1).reduce((sum, item) => sum + item.interest, 0);
  const originalRemainingTerm = schedule.length - periodAtPrepayment + 1;
  
  let newRepaymentSchedule: RepaymentItem[] = [];
  let newTotalInterest = interestPaidBefore;
  let newMonthlyPayment: number | undefined;
  let newTerm: number | undefined;
  
  if (params.prepaymentType === 'full') {
    newTerm = 0;
    newMonthlyPayment = 0;
    
    for (let i = 0; i < periodAtPrepayment - 1; i++) {
      newRepaymentSchedule.push({ ...schedule[i] });
    }
  } else {
    const newPrincipal = remainingPrincipal - params.prepaymentAmount;
    
    if (params.partialOption === 'reduce_payment') {
      newTerm = originalRemainingTerm - 1;
      const newSchedule = loanInfo.repaymentMethod === 'equal_principal_interest'
        ? calculateEqualPrincipalInterest(newPrincipal, currentRate, newTerm, params.prepaymentDate)
        : calculateEqualPrincipal(newPrincipal, currentRate, newTerm, params.prepaymentDate);
      
      newMonthlyPayment = newSchedule[0]?.totalPayment;
      
      for (let i = 0; i < periodAtPrepayment - 1; i++) {
        newRepaymentSchedule.push({ ...schedule[i] });
      }
      
      newSchedule.forEach((item, idx) => {
        newRepaymentSchedule.push({
          ...item,
          period: periodAtPrepayment + idx,
          source: '提前还款重算',
          isCorrected: false,
        });
      });
      
      newTotalInterest += newSchedule.reduce((sum, item) => sum + item.interest, 0);
    } else if (params.partialOption === 'reduce_term') {
      const originalMonthlyPayment = schedule[periodAtPrepayment - 1]?.totalPayment || 0;
      const monthlyRate = currentRate / 100 / 12;
      
      if (loanInfo.repaymentMethod === 'equal_principal_interest') {
        newTerm = Math.ceil(
          -Math.log(1 - (newPrincipal * monthlyRate) / originalMonthlyPayment) / Math.log(1 + monthlyRate)
        );
      } else {
        newTerm = Math.ceil(newPrincipal / (originalMonthlyPayment - newPrincipal * monthlyRate));
      }
      
      newTerm = Math.max(1, Math.min(newTerm, originalRemainingTerm - 1));
      newMonthlyPayment = originalMonthlyPayment;
      
      const newSchedule = loanInfo.repaymentMethod === 'equal_principal_interest'
        ? calculateEqualPrincipalInterest(newPrincipal, currentRate, newTerm, params.prepaymentDate)
        : calculateEqualPrincipal(newPrincipal, currentRate, newTerm, params.prepaymentDate);
      
      for (let i = 0; i < periodAtPrepayment - 1; i++) {
        newRepaymentSchedule.push({ ...schedule[i] });
      }
      
      newSchedule.forEach((item, idx) => {
        newRepaymentSchedule.push({
          ...item,
          period: periodAtPrepayment + idx,
          source: '提前还款重算',
          isCorrected: false,
        });
      });
      
      newTotalInterest += newSchedule.reduce((sum, item) => sum + item.interest, 0);
    }
  }
  
  const interestSaved = Math.round((originalTotalInterest - newTotalInterest) * 100) / 100;
  
  let penaltyAmount = 0;
  if (penaltyRule) {
    const currentMonthlyInterest = currentItem?.interest || 0;
    const penaltyResult = calculatePenalty(
      remainingPrincipal,
      currentMonthlyInterest,
      penaltyRule,
      loanInfo,
      params.prepaymentDate
    );
    penaltyAmount = penaltyResult.amount;
  }
  
  const netBenefit = Math.round((interestSaved - penaltyAmount) * 100) / 100;
  
  const warnings = generateWarnings(
    loanInfo,
    params,
    schedule,
    rateAdjustments,
    periodAtPrepayment,
    schedule.length,
    newTerm
  );
  
  return {
    id: `result_${Date.now()}`,
    params,
    originalTotalInterest: Math.round(originalTotalInterest * 100) / 100,
    originalTotalPayment: Math.round(originalTotalPayment * 100) / 100,
    newTotalInterest: Math.round(newTotalInterest * 100) / 100,
    newTotalPayment: Math.round((newTotalInterest + loanInfo.loanAmount) * 100) / 100,
    interestSaved,
    penaltyAmount,
    netBenefit,
    newMonthlyPayment,
    newTerm,
    originalRemainingTerm,
    remainingPrincipal,
    periodAtPrepayment,
    warnings,
    newRepaymentSchedule,
    source: '系统计算',
    createdAt: new Date().toISOString(),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
