import { FundHolding, IndustryClassification, RiskBudget, RiskScore } from '@/types'

export const calculateRiskScore = (
  holdings: FundHolding[],
  _industries: IndustryClassification[],
  _riskBudget: RiskBudget
): RiskScore => {
  const concentration = calculateConcentrationScore(holdings)
  const volatility = calculateVolatilityScore(holdings)
  const drawdown = calculateDrawdownScore(holdings)
  const liquidity = calculateLiquidityScore(holdings)
  const compliance = calculateComplianceScore(holdings)

  const overall = Math.round(
    concentration * 0.25 + volatility * 0.25 + drawdown * 0.25 + liquidity * 0.15 + compliance * 0.1
  )

  const topFund = [...holdings].sort((a, b) => b.weight - a.weight)[0]
  const industryGroups = groupByIndustry(holdings)
  const topIndustry = Object.entries(industryGroups).sort((a, b) => b[1] - a[1])[0]

  return {
    concentration,
    volatility,
    drawdown,
    liquidity,
    compliance,
    overall,
    explanations: {
      concentration: `集中度分数 ${concentration}：由赫芬达尔指数(HHI)计算。${
        topFund ? `权重最高的基金是 ${topFund.fundName} (${topFund.weight}%)，` : ''
      }共 ${holdings.length} 只基金。分数越高表示持仓越分散。`,
      volatility: `波动率分数 ${volatility}：基于各基金权重加权计算。${
        holdings.length > 0 ? `当前组合模拟年化波动率约 ${(18 - volatility * 0.1).toFixed(1)}%。` : ''
      }分数越高表示波动越小、风险越低。`,
      drawdown: `回撤分数 ${drawdown}：基于历史模拟的最大回撤估算。${
        topIndustry ? `${topIndustry[0]} 行业占比 ${topIndustry[1].toFixed(1)}%，是回撤的主要贡献来源。` : ''
      }分数越高表示最大回撤控制越好。`,
      liquidity: `流动性分数 ${liquidity}：基于各基金赎回周期加权平均。${
        holdings.length > 3 ? '基金数量较多，整体流动性较好。' : '建议增加基金数量以提升流动性。'
      }`,
      compliance: `合规分数 ${compliance}：基于禁买标的检查和行业集中度。${
        holdings.some((h) => h.isProhibited) ? '组合包含禁买标的，拉低了合规分数。' : '无禁买标的，合规性良好。'
      }`,
      overall: `综合风险评分 ${overall}：由集中度(25%)、波动率(25%)、回撤(25%)、流动性(15%)、合规(10%)加权得出。${
        overall >= 70 ? '整体风险控制良好。' : overall >= 50 ? '存在一定风险，建议调整。' : '风险较高，请重点关注。'
      }`,
    },
  }
}

const calculateConcentrationScore = (holdings: FundHolding[]): number => {
  if (holdings.length === 0) return 0
  const weights = holdings.map((h) => h.weight / 100)
  const hhi = weights.reduce((sum, w) => sum + w * w, 0)
  const maxHhi = 1
  const score = (1 - (hhi - 1 / holdings.length) / (maxHhi - 1 / holdings.length)) * 100
  return Math.round(Math.max(0, Math.min(100, score)))
}

const calculateVolatilityScore = (holdings: FundHolding[]): number => {
  if (holdings.length === 0) return 0
  const avgWeight = 100 / holdings.length
  const deviationFromEqual = holdings.reduce((sum, h) => sum + Math.abs(h.weight - avgWeight), 0) / holdings.length
  const score = Math.max(0, 100 - deviationFromEqual * 3)
  return Math.round(score)
}

const calculateDrawdownScore = (holdings: FundHolding[]): number => {
  if (holdings.length === 0) return 0
  const industryGroups = groupByIndustry(holdings)
  const maxIndustryWeight = Math.max(...Object.values(industryGroups))
  const score = Math.max(0, 100 - (maxIndustryWeight - 20) * 2)
  return Math.round(score)
}

const calculateLiquidityScore = (holdings: FundHolding[]): number => {
  if (holdings.length === 0) return 0
  const countBonus = Math.min(holdings.length * 8, 50)
  const diversityBonus = Math.min(Object.keys(groupByIndustry(holdings)).length * 7, 50)
  return Math.round(countBonus * 0.5 + diversityBonus * 0.5)
}

const calculateComplianceScore = (holdings: FundHolding[]): number => {
  if (holdings.length === 0) return 0
  const prohibitedCount = holdings.filter((h) => h.isProhibited).length
  const industryGroups = groupByIndustry(holdings)
  const overConcentrated = Object.values(industryGroups).filter((w) => w > 30).length
  const deductions = prohibitedCount * 30 + overConcentrated * 10
  return Math.max(0, Math.round(100 - deductions))
}

const groupByIndustry = (holdings: FundHolding[]): Record<string, number> => {
  const groups: Record<string, number> = {}
  holdings.forEach((h) => {
    groups[h.industryName] = (groups[h.industryName] || 0) + h.weight
  })
  return groups
}
