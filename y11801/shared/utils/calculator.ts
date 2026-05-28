export function calculateRemainingBalance(principal: number, interest: number, months: number): number {
  if (months <= 0) return principal + interest;
  const monthlyRate = interest / months;
  const balance = principal + (monthlyRate * months);
  return Math.round(balance * 100) / 100;
}

export function calculateFinalAmount(
  storePrice: number,
  residual: number,
  subsidy: number,
  clawback: number
): { payable: number; receivable: number } {
  const payable = Math.max(0, storePrice - residual - subsidy + clawback);
  const receivable = Math.max(0, residual + subsidy - storePrice - clawback);
  return {
    payable: Math.round(payable * 100) / 100,
    receivable: Math.round(receivable * 100) / 100,
  };
}

export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (months <= 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / months) * 100) / 100;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment * 100) / 100;
}

export function calculateRemainingPrincipal(
  principal: number,
  annualRate: number,
  totalMonths: number,
  paidMonths: number
): number {
  if (paidMonths <= 0) return principal;
  if (paidMonths >= totalMonths) return 0;
  const monthlyRate = annualRate / 12 / 100;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, totalMonths);
  let remaining = principal;
  for (let i = 0; i < paidMonths; i++) {
    const interest = remaining * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    remaining -= principalPayment;
  }
  return Math.round(remaining * 100) / 100;
}
