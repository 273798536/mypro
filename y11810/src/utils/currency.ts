export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  const validAmount = isNaN(amount) ? 0 : amount;

  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    HKD: 'HK$',
    TWD: 'NT$',
  };

  const symbol = currencySymbols[currency] || currency;
  const formatted = Math.abs(validAmount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return validAmount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatPercent(value: number): string {
  const validValue = isNaN(value) ? 0 : value;
  return `${(validValue * 100).toFixed(2)}%`;
}

export function formatNumber(num: number, decimals: number = 2): string {
  const validNum = isNaN(num) ? 0 : num;
  return validNum.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
