import type { CaseData, Judgment, Verdict } from '@/types'

export function validateJudgment(
  judgment: Judgment,
  caseData: CaseData
): { isCorrect: boolean; expectedVerdict: Verdict; correctReason: string; trapId?: string } {
  const expected = caseData.expectedJudgments.find(
    (ej) => ej.materialId === judgment.materialId
  )

  if (!expected) {
    return {
      isCorrect: true,
      expectedVerdict: judgment.verdict,
      correctReason: '该材料无需特定判定',
    }
  }

  const isCorrect = judgment.verdict === expected.expectedVerdict

  let correctReason = ''
  if (expected.trapId) {
    const trap = caseData.traps.find((t) => t.id === expected.trapId)
    if (trap) {
      correctReason = trap.correctHandling
    }
  } else {
    const materialLabels: Record<string, string> = {
      approved: '通过',
      rejected: '拒赔',
      pending_review: '待查',
    }
    correctReason = `正确判定为${materialLabels[expected.expectedVerdict] || expected.expectedVerdict}`
  }

  return {
    isCorrect,
    expectedVerdict: expected.expectedVerdict,
    correctReason,
    trapId: expected.trapId,
  }
}
