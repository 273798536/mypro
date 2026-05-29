import { SalaryItem, SpecialDeduction, BackPay, SalaryCalculation } from '../types';
import { taxBrackets } from '../data/mockData';

export const calculateTax = (taxableIncome: number): number => {
  if (taxableIncome <= 0) return 0;
  
  for (const bracket of taxBrackets) {
    if (taxableIncome > bracket.min) {
      return Math.max(0, Math.round((taxableIncome * bracket.rate - bracket.quickDeduction) * 100) / 100);
    }
  }
  
  return 0;
};

export const calculateSpecialDeductionTotal = (
  deductions: SpecialDeduction[],
  taxPeriod: string
): number => {
  return deductions
    .filter(d => d.effectiveMonth <= taxPeriod && (!d.expiryMonth || d.expiryMonth >= taxPeriod))
    .reduce((sum, d) => sum + d.amount, 0);
};

export const calculateSalary = (
  salaryItem: SalaryItem,
  specialDeductions: SpecialDeduction[],
  backPayRecords: BackPay[],
  taxPeriod: string
): SalaryCalculation => {
  const backPay = backPayRecords.find(
    b => b.employeeId === salaryItem.employeeId && b.targetPeriod === taxPeriod
  );
  
  const specialDeductionTotal = calculateSpecialDeductionTotal(specialDeductions, taxPeriod);
  const grossSalary = salaryItem.baseSalary 
    + salaryItem.performanceBonus 
    + salaryItem.overtimePay 
    + salaryItem.allowance 
    + salaryItem.otherIncome 
    + (backPay?.amount || 0);
  
  const socialSecurity = salaryItem.socialSecurityPersonal;
  const housingFund = salaryItem.housingFundPersonal;
  const taxableIncome = Math.max(0, grossSalary - socialSecurity - housingFund - 5000 - specialDeductionTotal);
  const taxAmount = calculateTax(taxableIncome);
  const backPayAdjustment = backPay?.taxAdjustment || 0;
  const netSalary = Math.round((grossSalary - socialSecurity - housingFund - taxAmount - salaryItem.otherDeduction - backPayAdjustment) * 100) / 100;
  
  return {
    id: `calc-${salaryItem.employeeId}-${taxPeriod.replace('-', '')}`,
    employeeId: salaryItem.employeeId,
    taxPeriodId: `period-${taxPeriod.replace('-', '')}`,
    grossSalary: Math.round(grossSalary * 100) / 100,
    socialSecurityPersonal: socialSecurity,
    housingFundPersonal: housingFund,
    specialDeductionTotal,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxAmount,
    backPayAdjustment,
    otherDeduction: salaryItem.otherDeduction,
    netSalary,
    calculationStatus: 'calculated',
    calculationTime: new Date().toISOString()
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};
