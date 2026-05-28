import {
  FundHolding,
  IndustryClassification,
  RiskBudget,
  ConstraintCheckResult,
  WeightCheckResult,
  IndustryCheckResult,
  ProhibitedCheckResult,
  IndustryViolation,
} from '@/types'
import { generateId } from '@/data/samples'

export const runConstraintChecks = (
  holdings: FundHolding[],
  industries: IndustryClassification[],
  _riskBudget: RiskBudget
): ConstraintCheckResult => {
  const weightCheck = checkWeight(holdings)
  const industryCheck = checkIndustry(holdings, industries)
  const prohibitedCheck = checkProhibited(holdings)

  return {
    id: generateId(),
    weightCheck,
    industryCheck,
    prohibitedCheck,
    checkedAt: new Date().toISOString(),
  }
}

export const checkWeight = (holdings: FundHolding[]): WeightCheckResult => {
  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0)
  const tolerance = 0.01
  const passed = Math.abs(totalWeight - 100) < tolerance

  return {
    passed,
    totalWeight,
    detail: passed
      ? `权重合计 ${totalWeight.toFixed(2)}%，符合要求`
      : `权重合计 ${totalWeight.toFixed(2)}%，偏离 100% 达 ${(100 - totalWeight).toFixed(2)} 个百分点`,
  }
}

export const checkIndustry = (
  holdings: FundHolding[],
  industries: IndustryClassification[]
): IndustryCheckResult => {
  const industryWeights: Record<string, number> = {}
  holdings.forEach((h) => {
    industryWeights[h.industryId] = (industryWeights[h.industryId] || 0) + h.weight
  })

  const violations: IndustryViolation[] = []
  industries.forEach((ind) => {
    const currentWeight = industryWeights[ind.id] || 0
    if (currentWeight > ind.maxWeight) {
      violations.push({
        industryId: ind.id,
        industryName: ind.name,
        currentWeight,
        maxWeight: ind.maxWeight,
        overage: currentWeight - ind.maxWeight,
      })
    }
  })

  return {
    passed: violations.length === 0,
    violations,
    detail:
      violations.length === 0
        ? '所有行业权重均在限制范围内'
        : `${violations.length} 个行业超限：${violations.map((v) => `${v.industryName}(${v.currentWeight.toFixed(1)}% > ${v.maxWeight}%)`).join(', ')}`,
  }
}

export const checkProhibited = (holdings: FundHolding[]): ProhibitedCheckResult => {
  const prohibitedFunds = holdings.filter((h) => h.isProhibited).map((h) => h.fundName)

  return {
    passed: prohibitedFunds.length === 0,
    prohibitedFunds,
    detail:
      prohibitedFunds.length === 0
        ? '未发现禁买标的'
        : `发现 ${prohibitedFunds.length} 只禁买基金：${prohibitedFunds.join(', ')}`,
  }
}
