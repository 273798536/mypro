import type { Judgment, Trap, TrapHit, CaseData } from '@/types'

export function checkTraps(
  judgment: Judgment,
  traps: Trap[],
  allJudgments: Judgment[],
  caseData: CaseData
): TrapHit[] {
  const hits: TrapHit[] = []

  const expected = caseData.expectedJudgments.find(
    (ej) => ej.materialId === judgment.materialId && ej.trapId
  )
  if (!expected || !expected.trapId) return hits

  const trap = traps.find((t) => t.id === expected.trapId)
  if (!trap) return hits

  if (judgment.verdict !== expected.expectedVerdict) {
    const trapLabel: Record<string, string> = {
      waiting_period: '等待期误判',
      invoice_duplicate: '发票重复',
      clause_expired: '条款过期',
    }

    hits.push({
      id: `thit-${Date.now()}-${trap.id}`,
      judgmentId: judgment.id,
      trapId: trap.id,
      trapType: trap.trapType,
      explanation: trap.description,
    })
  }

  return hits
}
