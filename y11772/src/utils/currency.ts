import { CURRENCY_RATES } from "@/data/mockData"

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number | null {
  if (fromCurrency === toCurrency) return amount
  const directRate = CURRENCY_RATES.find(
    (r) => r.from === fromCurrency && r.to === toCurrency
  )
  if (directRate) return Math.round(amount * directRate.rate)
  const toBase = CURRENCY_RATES.find(
    (r) => r.from === fromCurrency && r.to === "CNY"
  )
  const fromBase = CURRENCY_RATES.find(
    (r) => r.from === "CNY" && r.to === toCurrency
  )
  if (toBase && fromBase) return Math.round(amount * toBase.rate * fromBase.rate)
  return null
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", JPY: "¥" }
  const sym = symbols[currency] ?? ""
  if (amount >= 100000000) return `${sym}${(amount / 100000000).toFixed(2)}亿`
  if (amount >= 10000) return `${sym}${(amount / 10000).toFixed(1)}万`
  return `${sym}${amount.toLocaleString()}`
}
