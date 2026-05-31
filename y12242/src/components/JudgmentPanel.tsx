import { useState } from 'react'
import { FileSearch, FileText, Stethoscope, Receipt, ScrollText, CheckCircle, XCircle } from 'lucide-react'
import type { Material, Verdict, MaterialType, Judgment } from '@/types'
import { useGameStore } from '@/store/gameStore'

const ICON_MAP: Record<MaterialType, React.ElementType> = {
  policyCard: FileText,
  medicalRecord: Stethoscope,
  invoice: Receipt,
  clause: ScrollText,
}

const TYPE_LABEL: Record<MaterialType, string> = {
  policyCard: '保单',
  medicalRecord: '医疗记录',
  invoice: '发票',
  clause: '条款',
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string }> = {
  approved: { label: '通过', color: '#22c55e' },
  rejected: { label: '拒赔', color: '#ef4444' },
  pending_review: { label: '待查', color: '#f59e0b' },
}

interface JudgmentPanelProps {
  selectedMaterial: Material | null
  judgments: Judgment[]
}

export default function JudgmentPanel({ selectedMaterial, judgments }: JudgmentPanelProps) {
  const [reason, setReason] = useState('')
  const submitJudgment = useGameStore((s) => s.submitJudgment)

  if (!selectedMaterial) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[#f5f0e8]/50">
        <FileSearch className="h-12 w-12" />
        <p className="text-sm">← 选择左侧材料开始审查</p>
      </div>
    )
  }

  const Icon = ICON_MAP[selectedMaterial.materialType]
  const existingJudgment = judgments.find((j) => j.materialId === selectedMaterial.id)

  const handleSubmit = (verdict: Verdict) => {
    submitJudgment(selectedMaterial.id, selectedMaterial.materialType, verdict, reason)
    setReason('')
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2 rounded-lg bg-[#f5f0e8]/10 p-3">
        <Icon className="h-5 w-5 text-[#d4a843]" />
        <span className="text-sm font-semibold text-[#f5f0e8]">
          {TYPE_LABEL[selectedMaterial.materialType]} · {selectedMaterial.id.slice(-6)}
        </span>
      </div>

      {existingJudgment ? (
        <div className="rounded-lg border border-[#f5f0e8]/10 p-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: VERDICT_CONFIG[existingJudgment.verdict].color + '30', color: VERDICT_CONFIG[existingJudgment.verdict].color }}
            >
              {VERDICT_CONFIG[existingJudgment.verdict].label}
            </span>
            {existingJudgment.isCorrect ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
          </div>
          {existingJudgment.reason && (
            <p className="mt-2 text-xs text-[#f5f0e8]/70">{existingJudgment.reason}</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {(Object.keys(VERDICT_CONFIG) as Verdict[]).map((verdict) => (
              <button
                key={verdict}
                onClick={() => handleSubmit(verdict)}
                className="flex-1 rounded-lg py-2 text-sm font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: VERDICT_CONFIG[verdict].color + '25', color: VERDICT_CONFIG[verdict].color, border: `1px solid ${VERDICT_CONFIG[verdict].color}50` }}
              >
                {VERDICT_CONFIG[verdict].label}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="判定理由..."
            className="rounded-lg border border-[#f5f0e8]/10 bg-[#f5f0e8]/5 p-2 text-sm text-[#f5f0e8] placeholder-[#f5f0e8]/30 focus:outline-none focus:border-[#d4a843]/50"
            rows={3}
          />
        </>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-[#d4a843]">判定历史</h3>
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
          {judgments.length === 0 && (
            <p className="text-xs text-[#f5f0e8]/30">暂无判定记录</p>
          )}
          {judgments.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded bg-[#f5f0e8]/5 px-2 py-1">
              <span className="text-xs text-[#f5f0e8]/70">{j.materialId.slice(-6)}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: VERDICT_CONFIG[j.verdict].color }}
              >
                {VERDICT_CONFIG[j.verdict].label}
              </span>
              {j.isCorrect ? (
                <CheckCircle className="h-3 w-3 text-emerald-400" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
