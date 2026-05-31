import type { DifficultyConfig, TurnData, TurnSnapshot, Settlement, DeductionItem, ProjectCard, EvidenceEntry } from '@/types/game'

export function calculateComprehensiveRate(
  currentDebt: number,
  initialDebt: number,
  baseRate: number,
): number {
  const debtRatio = currentDebt / initialDebt
  const penalty = (debtRatio - 1) * 0.02
  return Math.max(baseRate + penalty, baseRate)
}

export function calculateInterest(debt: number, comprehensiveRate: number): number {
  return debt * comprehensiveRate
}

export function calculateRevenue(
  baseRevenue: number,
  totalInfraInvestment: number,
  satisfaction: number,
): number {
  const infraBonus = 1 + totalInfraInvestment / 500
  const satisfactionMod = satisfaction / 100
  return baseRevenue * infraBonus * satisfactionMod
}

export function calculateSatisfactionChange(
  welfareSpending: number,
  infraInvestment: number,
  interestUnderpaid: boolean,
  delayedProjectCount: number,
  decay: number,
  debtOptimizeProjects: number,
): number {
  let change = -decay
  change += welfareSpending * 0.1
  change += infraInvestment * 0.005
  if (interestUnderpaid) change -= 5
  change -= delayedProjectCount * 3
  change += debtOptimizeProjects * 2
  return change
}

export function processTurn(
  turnNumber: number,
  treasury: number,
  debt: number,
  satisfaction: number,
  comprehensiveRate: number,
  config: DifficultyConfig,
  totalInfraInvestment: number,
  infraInvestment: number,
  interestPayment: number,
  welfareSpending: number,
  acceptedProjects: ProjectCard[],
  previousInterest: number,
): {
  turnData: TurnData
  snapshot: TurnSnapshot
  newTreasury: number
  newDebt: number
  newSatisfaction: number
  newComprehensiveRate: number
  newTotalInfraInvestment: number
  revenue: number
  interestAccrued: number
  isInterestUnderpaid: boolean
  completedProjects: ProjectCard[]
  delayedProjects: ProjectCard[]
} {
  const revenue = calculateRevenue(config.baseRevenue, totalInfraInvestment, satisfaction)
  const interestAccrued = calculateInterest(debt, comprehensiveRate)
  const isInterestUnderpaid = interestPayment < interestAccrued * 0.5

  const acceptedInfraProjects = acceptedProjects.filter(p => p.type === 'infrastructure')
  const acceptedWelfareProjects = acceptedProjects.filter(p => p.type === 'welfare')
  const acceptedDebtProjects = acceptedProjects.filter(p => p.type === 'debt_optimize')

  let debtReduction = interestPayment
  let debtOptimizeBonus = 0
  for (const dp of acceptedDebtProjects) {
    debtOptimizeBonus += dp.cost * 0.5
    debtReduction += dp.cost * 0.3
  }

  let projectReturns = 0
  for (const p of acceptedProjects) {
    projectReturns += p.expectedReturn
  }

  let welfareBonus = 0
  for (const wp of acceptedWelfareProjects) {
    welfareBonus += wp.cost * 0.15
  }

  const totalIncome = revenue + projectReturns + welfareBonus
  const totalSpending = infraInvestment + interestPayment + welfareSpending

  let newTreasury = treasury + totalIncome - totalSpending
  let newDebt = debt - debtReduction + (newTreasury < 0 ? Math.abs(newTreasury) : 0)
  if (newTreasury < 0) newTreasury = 0

  if (newDebt < 0) {
    newTreasury += Math.abs(newDebt)
    newDebt = 0
  }

  const delayedCount = acceptedProjects.filter(p => p.delayed).length
  const satisfactionChange = calculateSatisfactionChange(
    welfareSpending + welfareBonus,
    infraInvestment,
    isInterestUnderpaid,
    delayedCount,
    config.satisfactionDecay,
    acceptedDebtProjects.length,
  )
  const newSatisfaction = Math.max(0, Math.min(100, satisfaction + satisfactionChange))

  const newTotalInfraInvestment = totalInfraInvestment + infraInvestment
  const newComprehensiveRate = calculateComprehensiveRate(newDebt, config.initialDebt, config.baseInterestRate)

  const turnData: TurnData = {
    turnNumber,
    treasuryBefore: treasury,
    debtBefore: debt,
    satisfactionBefore: satisfaction,
    infraInvestment,
    interestPayment,
    welfareSpending,
    treasuryAfter: newTreasury,
    debtAfter: newDebt,
    satisfactionAfter: newSatisfaction,
    revenue,
    interestAccrued,
    comprehensiveRate,
    projects: acceptedProjects,
    acceptedProjectIds: acceptedProjects.map(p => p.id),
  }

  const snapshot: TurnSnapshot = {
    turnNumber,
    treasury,
    debt,
    satisfaction,
    comprehensiveRate,
    decisions: {
      infraInvestment,
      interestPayment,
      welfareSpending,
      acceptedProjects: acceptedProjects.map(p => p.id),
    },
    results: {
      revenue,
      interestAccrued,
      satisfactionChange,
    },
  }

  return {
    turnData,
    snapshot,
    newTreasury,
    newDebt,
    newSatisfaction,
    newComprehensiveRate,
    newTotalInfraInvestment,
    revenue,
    interestAccrued,
    isInterestUnderpaid,
    completedProjects: acceptedProjects.filter(p => !p.delayed),
    delayedProjects: acceptedProjects.filter(p => p.delayed),
  }
}

export function calculateSettlement(
  config: DifficultyConfig,
  turns: TurnData[],
  finalDebt: number,
  finalSatisfaction: number,
  totalInfraInvestment: number,
  delayedProjects: ProjectCard[],
  evidenceLog: EvidenceEntry[],
): Settlement {
  const debtReduction = config.initialDebt - finalDebt
  const debtHealthScore = Math.max(0, Math.min(40, (debtReduction / config.initialDebt) * 40))

  const avgSatisfaction = turns.length > 0
    ? turns.reduce((sum, t) => sum + t.satisfactionAfter, 0) / turns.length
    : 0
  const satisfactionScore = Math.max(0, Math.min(30, (avgSatisfaction / 100) * 30))

  const totalProjectReturns = turns.reduce((sum, t) =>
    sum + t.projects.reduce((ps, p) => ps + p.actualReturn, 0), 0)
  const projectScore = Math.max(0, Math.min(20, (totalProjectReturns / config.initialDebt) * 20))

  const totalSpent = turns.reduce((sum, t) =>
    sum + t.infraInvestment + t.interestPayment + t.welfareSpending, 0)
  const totalEarned = turns.reduce((sum, t) => sum + t.revenue, 0)
  const efficiencyRatio = totalSpent > 0 ? totalEarned / totalSpent : 0
  const efficiencyScore = Math.max(0, Math.min(10, efficiencyRatio * 10))

  const deductions: DeductionItem[] = []

  for (const dp of delayedProjects) {
    const penaltyReturn = dp.expectedReturn * 0.5
    const penaltyAmount = penaltyReturn + 10
    deductions.push({
      category: '项目延期',
      amount: Math.round(penaltyAmount),
      reason: `"${dp.name}"延期导致收益减半并产生额外扣罚`,
      evidenceRef: evidenceLog.find(e => e.category === 'delay' && e.description.includes(dp.name))?.id || '',
      calculationMethodology: `扣罚 = 收益减半(${penaltyReturn.toFixed(1)}万) + 延期罚金(10万) = ${penaltyAmount.toFixed(1)}万`,
    })
  }

  for (const turn of turns) {
    if (turn.interestPayment < turn.interestAccrued * 0.5) {
      const shortfall = turn.interestAccrued * 0.5 - turn.interestPayment
      deductions.push({
        category: '利息未足额偿还',
        amount: Math.round(shortfall),
        reason: `第${turn.turnNumber}回合利息偿还不足最低标准(应还${(turn.interestAccrued * 0.5).toFixed(1)}万，实还${turn.interestPayment.toFixed(1)}万)`,
        evidenceRef: evidenceLog.find(e => e.category === 'interest' && e.turnNumber === turn.turnNumber)?.id || '',
        calculationMethodology: `不足额 = 最低偿还(${(turn.interestAccrued * 0.5).toFixed(1)}万) - 实际偿还(${turn.interestPayment.toFixed(1)}万) = ${shortfall.toFixed(1)}万`,
      })
    }
  }

  const consistencyWarnings = evidenceLog.filter(e => e.category === 'consistency')

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const rawScore = debtHealthScore + satisfactionScore + projectScore + efficiencyScore
  const totalScore = Math.max(0, rawScore - totalDeductions * 0.1)

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    debtHealthScore: Math.round(debtHealthScore * 10) / 10,
    satisfactionScore: Math.round(satisfactionScore * 10) / 10,
    projectScore: Math.round(projectScore * 10) / 10,
    efficiencyScore: Math.round(efficiencyScore * 10) / 10,
    deductions,
    consistencyWarnings,
  }
}

export function checkEndCondition(
  currentTurn: number,
  maxTurns: number,
  satisfaction: number,
  debt: number,
  initialDebt: number,
): { ended: boolean; reason: string } {
  if (currentTurn >= maxTurns) {
    return { ended: true, reason: `已达最大回合数(${maxTurns}回合)` }
  }
  if (satisfaction <= 0) {
    return { ended: true, reason: '民生满意度归零，社会动荡' }
  }
  if (debt > initialDebt * 2) {
    return { ended: true, reason: '债务规模失控，超过初始债务两倍' }
  }
  return { ended: false, reason: '' }
}

export function generateReport(gameState: {
  difficulty: string
  config: DifficultyConfig
  turns: TurnData[]
  snapshots: TurnSnapshot[]
  evidenceLog: EvidenceEntry[]
  settlement: Settlement | null
  delayedProjects: ProjectCard[]
}): string {
  const { difficulty, config, turns, evidenceLog, settlement } = gameState
  const report = {
    title: '债务偿还经营赛 · 经营报告',
    generatedAt: new Date().toISOString(),
    gameConfig: {
      difficulty,
      initialTreasury: config.initialTreasury,
      initialDebt: config.initialDebt,
      baseInterestRate: config.baseInterestRate,
      maxTurns: config.maxTurns,
    },
    settlement,
    turns: turns.map(t => ({
      turn: t.turnNumber,
      treasuryBefore: t.treasuryBefore,
      debtBefore: t.debtBefore,
      decisions: {
        infraInvestment: t.infraInvestment,
        interestPayment: t.interestPayment,
        welfareSpending: t.welfareSpending,
      },
      results: {
        revenue: t.revenue,
        interestAccrued: t.interestAccrued,
        comprehensiveRate: t.comprehensiveRate,
        treasuryAfter: t.treasuryAfter,
        debtAfter: t.debtAfter,
        satisfactionAfter: t.satisfactionAfter,
      },
    })),
    evidenceLog: evidenceLog.map(e => ({
      turn: e.turnNumber,
      category: e.category,
      description: e.description,
      calculationDetail: e.calculationDetail,
      consistencyFlag: e.consistencyFlag,
      satisfactionSupplement: e.satisfactionSupplement,
    })),
    calculationMethodology: {
      interestFormula: '每回合利息 = 剩余债务 × 综合利率',
      comprehensiveRateFormula: '综合利率 = 基础利率 + max(0, (债务/初始债务 - 1) × 2%)',
      revenueFormula: '实际收入 = 基础税收 × (1 + 基建累计投资/500) × (满意度/100)',
      satisfactionDecay: `每回合自然衰减 -${config.satisfactionDecay}`,
      minimumInterestPayment: '最低偿还 = 利息的50%，低于此触发信用降级',
      projectDelayPenalty: '延期项目收益减半 + 扣罚10万 + 满意度-3',
    },
  }
  return JSON.stringify(report, null, 2)
}

export function generateHTMLReport(gameState: Parameters<typeof generateReport>[0]): string {
  const { difficulty, config, turns, evidenceLog, settlement } = gameState
  const lastTurn = turns[turns.length - 1]

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>债务偿还经营赛 · 经营报告</title>
<style>
body{font-family:'Noto Sans SC',sans-serif;max-width:960px;margin:0 auto;padding:24px;background:#0D1B1E;color:#E8E8E8}
h1{color:#D4A843;border-bottom:2px solid #D4A843;padding-bottom:8px}
h2{color:#D4A843;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #3A506B;padding:8px;text-align:center}
th{background:#1B2838;color:#D4A843}
.warn{color:#8B2500}
.method{background:#1B2838;padding:12px;border-radius:8px;margin:8px 0;font-size:14px}
.evidence{border-left:3px solid #D4A843;padding:8px 12px;margin:6px 0;background:#1B2838}
</style>
</head>
<body>
<h1>债务偿还经营赛 · 经营报告</h1>
<p>难度：${difficulty} | 初始国库：${config.initialTreasury}万 | 初始债务：${config.initialDebt}万 | 回合数：${turns.length}</p>`

  if (settlement) {
    html += `
<h2>结算评分</h2>
<table>
<tr><th>总分</th><th>债务健康</th><th>满意度</th><th>项目收益</th><th>运营效率</th></tr>
<tr><td style="font-size:24px;color:#D4A843">${settlement.totalScore}</td><td>${settlement.debtHealthScore}</td><td>${settlement.satisfactionScore}</td><td>${settlement.projectScore}</td><td>${settlement.efficiencyScore}</td></tr>
</table>`

    if (settlement.deductions.length > 0) {
      html += `<h2>扣分明细</h2><table><tr><th>类别</th><th>金额</th><th>原因</th><th>计算口径</th></tr>`
      for (const d of settlement.deductions) {
        html += `<tr><td class="warn">${d.category}</td><td>${d.amount}万</td><td>${d.reason}</td><td style="font-size:12px">${d.calculationMethodology}</td></tr>`
      }
      html += `</table>`
    }

    if (settlement.consistencyWarnings.length > 0) {
      html += `<h2>一致性标记</h2>`
      for (const w of settlement.consistencyWarnings) {
        html += `<div class="evidence"><strong>第${w.turnNumber}回合</strong> ${w.description}<br><small>${w.calculationDetail}</small></div>`
      }
    }
  }

  html += `<h2>回合记录</h2><table><tr><th>回合</th><th>国库(前)</th><th>债务(前)</th><th>基建</th><th>偿债</th><th>民生</th><th>收入</th><th>利息</th><th>国库(后)</th><th>满意度(后)</th></tr>`
  for (const t of turns) {
    html += `<tr><td>${t.turnNumber}</td><td>${t.treasuryBefore.toFixed(1)}</td><td>${t.debtBefore.toFixed(1)}</td><td>${t.infraInvestment}</td><td>${t.interestPayment}</td><td>${t.welfareSpending}</td><td>${t.revenue.toFixed(1)}</td><td>${t.interestAccrued.toFixed(1)}</td><td>${t.treasuryAfter.toFixed(1)}</td><td>${t.satisfactionAfter.toFixed(0)}</td></tr>`
  }
  html += `</table>`

  html += `<h2>证据日志</h2>`
  for (const e of evidenceLog) {
    html += `<div class="evidence"><strong>第${e.turnNumber}回合 · ${e.category}</strong> ${e.description}<br><small>${e.calculationDetail}</small>${e.consistencyFlag ? '<br><span class="warn">⚠ 存在一致性标记</span>' : ''}</div>`
  }

  html += `
<h2>偿债计算口径说明</h2>
<div class="method">
<p><strong>利息计算</strong>：每回合利息 = 剩余债务 × 综合利率</p>
<p><strong>综合利率</strong>：综合利率 = 基础利率(${(config.baseInterestRate * 100).toFixed(0)}%) + max(0, (债务/初始债务 - 1) × 2%)</p>
<p><strong>收入计算</strong>：实际收入 = 基础税收(${config.baseRevenue}万) × (1 + 基建累计投资/500) × (满意度/100)</p>
<p><strong>满意度衰减</strong>：每回合自然衰减 -${config.satisfactionDecay}</p>
<p><strong>最低偿还</strong>：利息的50%，低于此触发信用降级</p>
<p><strong>项目延期</strong>：收益减半 + 扣罚10万 + 满意度-3</p>
</div>
<p style="text-align:center;color:#3A506B;font-size:12px">报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
</body></html>`

  return html
}
