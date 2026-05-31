import type {
  CaseData,
  GameReport,
  Judgment,
  LinkageEntry,
  ReplayEvent,
  TrapHit,
} from '@/types'

export function generateReport(
  caseData: CaseData,
  judgments: Judgment[],
  trapHits: TrapHit[],
  replayEvents: ReplayEvent[],
  timeUsed: number
): GameReport {
  const linkageMap = generateLinkageMap(caseData, judgments)

  const traps = caseData.traps.map((trap) => ({
    trapType: trap.trapType,
    description: trap.description,
    relatedMaterialIds: trap.relatedMaterialIds,
    correctHandling: trap.correctHandling,
    wasTriggered: trapHits.some((hit) => hit.trapId === trap.id),
  }))

  return {
    reportMeta: {
      caseId: caseData.id,
      caseTitle: caseData.title,
      detectiveName: '理赔侦探',
      reviewTime: new Date().toISOString(),
      timeUsed,
    },
    policyCards: caseData.policyCards,
    medicalRecords: caseData.medicalRecords,
    invoices: caseData.invoices,
    clauses: caseData.clauses,
    judgments,
    traps,
    linkageMap,
    replayTimeline: replayEvents,
  }
}

function generateLinkageMap(
  caseData: CaseData,
  judgments: Judgment[]
): LinkageEntry[] {
  const entries: LinkageEntry[] = []

  for (const policyCard of caseData.policyCards) {
    const relatedRecords = caseData.medicalRecords.filter(
      (mr) => mr.policyCardId === policyCard.id
    )
    const relatedInvoices = caseData.invoices.filter(
      (inv) => inv.policyCardId === policyCard.id
    )
    const relatedClauses = caseData.clauses.filter(
      (cl) => cl.caseId === policyCard.caseId
    )

    const policyJudgment = judgments.find(
      (j) => j.materialId === policyCard.id
    )
    if (policyJudgment) {
      entries.push({
        policyCardId: policyCard.id,
        judgmentId: policyJudgment.id,
        description: `保单卡 ${policyCard.policyNumber} 判定：${verdictLabel(policyJudgment.verdict)}`,
      })
    }

    for (const record of relatedRecords) {
      const j = judgments.find((j) => j.materialId === record.id)
      if (j) {
        entries.push({
          policyCardId: policyCard.id,
          medicalRecordId: record.id,
          judgmentId: j.id,
          description: `病历「${record.diagnosis}」(${record.visitDate}) 判定：${verdictLabel(j.verdict)}`,
        })
      }
    }

    for (const invoice of relatedInvoices) {
      const j = judgments.find((j) => j.materialId === invoice.id)
      if (j) {
        entries.push({
          policyCardId: policyCard.id,
          invoiceId: invoice.id,
          judgmentId: j.id,
          description: `发票 ${invoice.invoiceNumber}(¥${invoice.amount}) 判定：${verdictLabel(j.verdict)}`,
        })
      }
    }

    for (const clause of relatedClauses) {
      const j = judgments.find((j) => j.materialId === clause.id)
      if (j) {
        entries.push({
          policyCardId: policyCard.id,
          clauseId: clause.id,
          judgmentId: j.id,
          description: `条款「${clause.clauseName}」判定：${verdictLabel(j.verdict)}`,
        })
      }
    }
  }

  return entries
}

function verdictLabel(verdict: string): string {
  const map: Record<string, string> = {
    approved: '通过',
    rejected: '拒赔',
    pending_review: '待查',
  }
  return map[verdict] || verdict
}

export function exportReport(report: GameReport): void {
  const json = JSON.stringify(report, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `理赔报告_${report.reportMeta.caseId}_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
