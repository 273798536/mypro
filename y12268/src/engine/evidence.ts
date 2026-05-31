import type { EvidenceEntry, EvidenceCategory, RevenueVersion, DelayRecord, ProjectCard } from '@/types/game'

let evidenceCounter = 0

export function generateEvidenceId(): string {
  evidenceCounter++
  return `ev_${Date.now()}_${evidenceCounter}`
}

export function createEvidenceEntry(
  turnNumber: number,
  category: EvidenceCategory,
  description: string,
  calculationDetail: string,
  consistencyFlag: boolean = false,
  satisfactionSupplement: number | null = null,
): EvidenceEntry {
  return {
    id: generateEvidenceId(),
    turnNumber,
    category,
    description,
    calculationDetail,
    consistencyFlag,
    satisfactionSupplement,
    timestamp: Date.now(),
  }
}

export function createInterestEvidence(
  turnNumber: number,
  debt: number,
  comprehensiveRate: number,
  interestAccrued: number,
  interestPaid: number,
  previousInterest: number,
  isUnderpaid: boolean,
): EvidenceEntry {
  const detail = `利息 = 剩余债务(${debt.toFixed(1)}万) × 综合利率(${(comprehensiveRate * 100).toFixed(2)}%) = ${interestAccrued.toFixed(1)}万`
  const diff = interestAccrued - previousInterest
  const diffNote = previousInterest > 0 ? ` | 较上回合${diff > 0 ? '增加' : '减少'}${Math.abs(diff).toFixed(1)}万` : ''

  return createEvidenceEntry(
    turnNumber,
    'interest',
    `第${turnNumber}回合利息计算${isUnderpaid ? ' [未足额偿还]' : ''}`,
    detail + diffNote + (isUnderpaid ? ` | 实际偿还${interestPaid.toFixed(1)}万，不足应还利息${interestAccrued.toFixed(1)}万` : ''),
    isUnderpaid,
    isUnderpaid ? -5 : null,
  )
}

export function createRevenueEvidence(
  turnNumber: number,
  oldRevenue: number,
  newRevenue: number,
  reason: string,
): { evidence: EvidenceEntry; version: RevenueVersion } {
  const isDecline = newRevenue < oldRevenue
  const evidence = createEvidenceEntry(
    turnNumber,
    'revenue',
    `第${turnNumber}回合收入${isDecline ? '下滑' : '变动'}：${oldRevenue.toFixed(1)}万 → ${newRevenue.toFixed(1)}万`,
    `原因：${reason} | 变动额：${(newRevenue - oldRevenue).toFixed(1)}万`,
    false,
    null,
  )

  const version: RevenueVersion = {
    version: turnNumber,
    turnNumber,
    oldValue: oldRevenue,
    newValue: newRevenue,
    changeReason: reason,
  }

  return { evidence, version }
}

export function createDelayEvidence(
  turnNumber: number,
  project: ProjectCard,
  penaltyAmount: number,
): { evidence: EvidenceEntry; delayRecord: DelayRecord } {
  const evidence = createEvidenceEntry(
    turnNumber,
    'delay',
    `项目"${project.name}"延期`,
    `原定第${project.turnDrawn}回合完成 → 延至第${turnNumber + 1}回合 | 扣罚：${penaltyAmount.toFixed(1)}万 | 收益减半：${project.expectedReturn.toFixed(1)}万 → ${(project.expectedReturn * 0.5).toFixed(1)}万`,
    true,
    -3,
  )

  const delayRecord: DelayRecord = {
    projectId: project.id,
    projectName: project.name,
    originalTurn: project.turnDrawn,
    delayedToTurn: turnNumber + 1,
    reason: '施工进度滞后/资金拨付延迟',
    penaltyAmount,
  }

  return { evidence, delayRecord }
}

export function createConsistencyEvidence(
  turnNumber: number,
  projectName: string,
  projectConclusion: string,
  debtConclusion: string,
  satisfactionValue: number,
): EvidenceEntry {
  return createEvidenceEntry(
    turnNumber,
    'consistency',
    `项目卡结论与债务额度不一致：${projectName}`,
    `项目卡结论：${projectConclusion} | 债务额度结论：${debtConclusion} | 满意度补充证据：${satisfactionValue.toFixed(0)}/100`,
    true,
    satisfactionValue,
  )
}

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  interest: '利息计算',
  delay: '项目延期',
  revenue: '收入变动',
  consistency: '一致性标记',
}

export const EVIDENCE_CATEGORY_COLORS: Record<EvidenceCategory, string> = {
  interest: 'text-amber-400',
  delay: 'text-red-400',
  revenue: 'text-slate-400',
  consistency: 'text-purple-400',
}

export const EVIDENCE_CATEGORY_BG: Record<EvidenceCategory, string> = {
  interest: 'bg-amber-400/10 border-amber-400/30',
  delay: 'bg-red-400/10 border-red-400/30',
  revenue: 'bg-slate-400/10 border-slate-400/30',
  consistency: 'bg-purple-400/10 border-purple-400/30',
}
