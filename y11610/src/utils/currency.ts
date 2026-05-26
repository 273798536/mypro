import { Currency, CURRENCY_SYMBOLS, ExchangeRate } from '../types';

export function formatCurrency(amount: number, currency: Currency, decimals: number = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol} ${formatted}`;
}

export function formatNumber(amount: number, decimals: number = 2): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(rate: number, decimals: number = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: ExchangeRate[],
  rateDate?: string
): { amount: number; rate: number; rateId?: string } {
  if (fromCurrency === toCurrency) {
    return { amount, rate: 1 };
  }

  let matchingRates = rates.filter(
    (r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
  );

  if (rateDate) {
    const dateMatch = matchingRates.find((r) => r.rateDate === rateDate);
    if (dateMatch) {
      return {
        amount: amount * dateMatch.rate,
        rate: dateMatch.rate,
        rateId: dateMatch.id,
      };
    }
  }

  if (matchingRates.length > 0) {
    const latestRate = matchingRates.sort(
      (a, b) => new Date(b.rateDate).getTime() - new Date(a.rateDate).getTime()
    )[0];
    return {
      amount: amount * latestRate.rate,
      rate: latestRate.rate,
      rateId: latestRate.id,
    };
  }

  const reverseRates = rates.filter(
    (r) => r.fromCurrency === toCurrency && r.toCurrency === fromCurrency
  );

  if (reverseRates.length > 0) {
    const latestRate = reverseRates.sort(
      (a, b) => new Date(b.rateDate).getTime() - new Date(a.rateDate).getTime()
    )[0];
    return {
      amount: amount / latestRate.rate,
      rate: 1 / latestRate.rate,
      rateId: latestRate.id,
    };
  }

  const usdFrom = rates.find(
    (r) => r.fromCurrency === fromCurrency && r.toCurrency === 'USD'
  );
  const usdTo = rates.find(
    (r) => r.fromCurrency === 'USD' && r.toCurrency === toCurrency
  );

  if (usdFrom && usdTo) {
    const rate = usdFrom.rate * usdTo.rate;
    return {
      amount: amount * rate,
      rate,
    };
  }

  throw new Error(`未找到 ${fromCurrency} 到 ${toCurrency} 的汇率`);
}

export function parseCurrencyString(str: string): number {
  const clean = str.replace(/[^0-9.-]/g, '');
  return parseFloat(clean) || 0;
}

export function getCurrencyColor(currency: Currency): string {
  const colors: Record<Currency, string> = {
    USD: 'text-green-600',
    EUR: 'text-blue-600',
    CNY: 'text-red-600',
    GBP: 'text-purple-600',
    JPY: 'text-yellow-600',
    HKD: 'text-cyan-600',
  };
  return colors[currency] || 'text-gray-600';
}
