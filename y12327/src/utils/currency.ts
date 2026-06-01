import type { CurrencyUnit } from '@/types'

const EXCHANGE_RATES: Record<CurrencyUnit, number> = {
  CNY: 1,
  USD: 7.25,
  EUR: 7.85,
  JPY: 0.048
}

const CURRENCY_SYMBOLS: Record<CurrencyUnit, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  JPY: '¥'
}

export function convertCurrency(
  amount: number,
  fromUnit: CurrencyUnit,
  toUnit: CurrencyUnit
): number {
  const amountInCNY = amount * EXCHANGE_RATES[fromUnit]
  return amountInCNY / EXCHANGE_RATES[toUnit]
}

export function formatCurrency(
  amount: number,
  unit: CurrencyUnit,
  decimals: number = 2
): string {
  const symbol = CURRENCY_SYMBOLS[unit]
  return `${symbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`
}

export function formatCurrencyWithUnit(
  amount: number,
  unit: CurrencyUnit,
  decimals: number = 2
): string {
  return `${formatCurrency(amount, unit, decimals)} ${unit}`
}

export function getCurrencySymbol(unit: CurrencyUnit): string {
  return CURRENCY_SYMBOLS[unit]
}

export function getExchangeRate(from: CurrencyUnit, to: CurrencyUnit): number {
  return EXCHANGE_RATES[from] / EXCHANGE_RATES[to]
}
