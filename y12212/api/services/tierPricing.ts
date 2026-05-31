import { getDb } from '../database/init.js'
import type { UserType, TierPrice } from '../../shared/types.js'

export interface TierBreakdown {
  tier: number
  usage: number
  price_per_ton: number
  amount: number
}

export interface TierCalculationResult {
  total_usage: number
  total_amount: number
  breakdown: TierBreakdown[]
}

export function getTierPrices(userType: UserType): TierPrice[] {
  const db = getDb()
  return db.prepare('SELECT * FROM tier_price WHERE user_type = ? ORDER BY tier ASC').all(userType) as TierPrice[]
}

export function calculateTierAmount(userType: UserType, totalUsage: number): TierCalculationResult {
  const prices = getTierPrices(userType)
  if (prices.length === 0) {
    return { total_usage: totalUsage, total_amount: 0, breakdown: [] }
  }

  const breakdown: TierBreakdown[] = []
  let remainingUsage = totalUsage
  let totalAmount = 0

  for (const price of prices) {
    if (remainingUsage <= 0) break

    const tierRange = price.max_usage - price.min_usage
    const tierUsage = Math.min(remainingUsage, tierRange)

    if (tierUsage <= 0) continue

    const amount = Math.round(tierUsage * price.price_per_ton * 100) / 100
    breakdown.push({
      tier: price.tier,
      usage: tierUsage,
      price_per_ton: price.price_per_ton,
      amount,
    })

    totalAmount += amount
    remainingUsage -= tierUsage
  }

  totalAmount = Math.round(totalAmount * 100) / 100

  return {
    total_usage: totalUsage,
    total_amount: totalAmount,
    breakdown,
  }
}
