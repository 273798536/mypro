import type { RiskScore, RiskScoreFactor } from '../types'

export function calculateRiskScore(factors: RiskScoreFactor[]): number {
  return factors.reduce((sum, f) => sum + f.contribution, 0)
}

export function getScoreLevel(score: number): '高风险' | '中风险' | '低风险' {
  if (score >= 80) return '高风险'
  if (score >= 50) return '中风险'
  return '低风险'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#EF4444'
  if (score >= 50) return '#F59E0B'
  return '#10B981'
}

export function explainScore(riskScore: RiskScore): string[] {
  const lines: string[] = []
  lines.push(`总分：${riskScore.totalScore}（${getScoreLevel(riskScore.totalScore)}）`)
  lines.push('')

  for (const factor of riskScore.factors) {
    const level = getScoreLevel(factor.contribution)
    lines.push(`【${factor.name}】权重${(factor.weight * 100).toFixed(0)}% | 原始值${factor.rawValue.toFixed(2)} | 贡献${factor.contribution.toFixed(1)}分（${level}）`)
    if (factor.anomalySource) {
      lines.push(`  ↳ 异常来源：${factor.anomalySource}`)
    }
  }

  const anomalyFactors = riskScore.factors.filter((f) => f.anomalySource)
  if (anomalyFactors.length > 0) {
    lines.push('')
    lines.push(`⚠ 异常因子数：${anomalyFactors.length}/${riskScore.factors.length}`)
    for (const f of anomalyFactors) {
      lines.push(`  - ${f.name}：${f.anomalySource}`)
    }
  }

  return lines
}
