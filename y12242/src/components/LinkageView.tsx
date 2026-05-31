import { FileText, Stethoscope, Receipt, ScrollText, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react'
import type { LinkageEntry, PolicyCard, MedicalRecord, Invoice, Clause } from '@/types'
import { useGameStore } from '@/store/gameStore'

interface LinkageViewProps {
  linkageMap: LinkageEntry[]
  policyCards: PolicyCard[]
  medicalRecords: MedicalRecord[]
  invoices: Invoice[]
  clauses: Clause[]
}

function getVerdictFromDescription(description: string): { label: string; icon: typeof ShieldCheck; colorClass: string } {
  if (description.includes('拒赔')) {
    return { label: '拒赔', icon: ShieldX, colorClass: 'text-red-400 border-red-500/50' }
  }
  if (description.includes('待查')) {
    return { label: '待查', icon: ShieldAlert, colorClass: 'text-amber-400 border-amber-500/50' }
  }
  return { label: '通过', icon: ShieldCheck, colorClass: 'text-green-400 border-green-500/50' }
}

export default function LinkageView({ linkageMap, policyCards, medicalRecords, invoices, clauses }: LinkageViewProps) {
  const judgments = useGameStore((s) => s.judgments)

  const grouped = policyCards.map((pc) => ({
    card: pc,
    entries: linkageMap.filter((e) => e.policyCardId === pc.id),
  }))

  return (
    <div className="space-y-8">
      {grouped.map(({ card, entries }) => (
        <div key={card.id}>
          <div className="flex items-center gap-3 rounded-lg border-2 border-amber-500/60 bg-gradient-to-r from-amber-900/40 to-amber-800/20 px-4 py-3 shadow-[0_0_16px_rgba(212,168,67,0.2)]">
            <FileText className="w-5 h-5 text-amber-300" />
            <span className="text-lg font-bold text-amber-300">保单 {card.policyNumber}</span>
            <span className="text-xs text-amber-400/70">{card.insuranceType}</span>
          </div>

          {entries.length > 0 && (
            <div className="relative ml-6 border-l-2 border-amber-500/30 pl-6 pt-4 space-y-4">
              {entries.map((entry) => {
                const med = entry.medicalRecordId ? medicalRecords.find((m) => m.id === entry.medicalRecordId) : null
                const inv = entry.invoiceId ? invoices.find((i) => i.id === entry.invoiceId) : null
                const cls = entry.clauseId ? clauses.find((c) => c.id === entry.clauseId) : null
                const judgment = judgments.find((j) => j.id === entry.judgmentId)
                const verdictInfo = judgment
                  ? judgment.verdict === 'approved'
                    ? { label: '通过', icon: ShieldCheck, colorClass: 'text-green-400 border-green-500/50' }
                    : judgment.verdict === 'rejected'
                    ? { label: '拒赔', icon: ShieldX, colorClass: 'text-red-400 border-red-500/50' }
                    : { label: '待查', icon: ShieldAlert, colorClass: 'text-amber-400 border-amber-500/50' }
                  : getVerdictFromDescription(entry.description)
                const VIcon = verdictInfo.icon

                return (
                  <div key={entry.judgmentId} className="space-y-2">
                    {med && (
                      <div className="flex items-center gap-2 rounded-md bg-[#f5f0e8] px-3 py-2 text-gray-900">
                        <Stethoscope className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm">{med.diagnosis} ({med.visitDate})</span>
                      </div>
                    )}
                    {inv && (
                      <div className="flex items-center gap-2 rounded-md bg-[#f5f0e8] px-3 py-2 text-gray-900">
                        <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm">{inv.invoiceNumber} · ¥{inv.amount.toLocaleString()}</span>
                      </div>
                    )}
                    {cls && (
                      <div className="flex items-center gap-2 rounded-md bg-[#f5f0e8] px-3 py-2 text-gray-900">
                        <ScrollText className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm">{cls.clauseName}{cls.isExpired ? ' (已过期)' : ''}</span>
                      </div>
                    )}
                    <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 ${verdictInfo.colorClass} bg-[#1e2436]`}>
                      <VIcon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">{verdictInfo.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
