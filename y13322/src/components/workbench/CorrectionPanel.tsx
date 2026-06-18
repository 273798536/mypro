import { useState } from 'react'
import { PenLine, History, Check } from 'lucide-react'
import type { SampleEvidence } from '@/types'
import { useReviewStore } from '@/store/useReviewStore'

interface CorrectionPanelProps {
  sample: SampleEvidence | null
}

export function CorrectionPanel({ sample }: CorrectionPanelProps) {
  const { applyCorrection, markStatus, orders } = useReviewStore()
  const [score, setScore] = useState('')
  const [reason, setReason] = useState('')
  const [reviewer] = useState('负责人·周')
  const [done, setDone] = useState(false)

  if (!sample) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-ink-400">
        选择样本后录入人工改判
      </div>
    )
  }

  const corr = sample.manualCorrection
  const order = orders.find((o) => o.orderId === sample.orderId)

  const handleSubmit = () => {
    const n = Number(score)
    if (Number.isNaN(n)) return
    applyCorrection({ sampleId: sample.sampleId, manualScore: n, reason, reviewer })
    setDone(true)
    setScore('')
    setReason('')
    window.setTimeout(() => setDone(false), 1800)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-900/10 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <PenLine className="h-4 w-4 text-forensic" />
          <h3 className="font-serif text-sm font-700 text-ink-900">人工改判</h3>
        </div>
        <p className="mt-0.5 text-[10px] text-ink-400">
          录入后将保护人工修正，不被新结果盖掉
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="mb-1 block text-[11px] font-600 text-ink-500">
            人工修正分数
          </label>
          <div className="flex items-center gap-2">
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              type="number"
              min={0}
              max={100}
              placeholder={String(sample.machineScore)}
              className="w-24 rounded-[3px] border border-ink-900/15 bg-paper-50 px-2.5 py-1.5 font-mono text-sm text-ink-900 focus:border-dossier/50 focus:outline-none"
            />
            <span className="text-[11px] text-ink-400">
              机器 <b className="text-dossier">{sample.machineScore}</b>
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-600 text-ink-500">改判理由</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder="说明人工改判依据，作为处理记录证据"
            className="w-full resize-none rounded-[3px] border border-ink-900/15 bg-paper-50 px-2.5 py-2 text-xs leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-dossier/50 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[3px] bg-dossier px-3 py-2 text-xs font-600 text-paper-50 transition hover:bg-dossier-600 disabled:opacity-50"
          disabled={!score || !reason}
        >
          {done ? (
            <>
              <Check className="h-3.5 w-3.5" /> 已提交（已保护）
            </>
          ) : (
            '提交人工改判'
          )}
        </button>

        <div className="rounded-md border border-forensic/30 bg-forensic/5 px-3 py-2 text-[10px] leading-relaxed text-forensicDark">
          <span className="font-700">覆盖保护：</span>
          若该样本已有人工修正，且新录入方向相反或差距≥3分，将弹窗拦截，避免人工修正被新结果盖掉。
        </div>

        {corr && (
          <div className="rounded-md border border-ink-900/10 bg-paper-100/60 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-600 text-ink-500">
              <History className="h-3.5 w-3.5" />
              最近改判记录
            </div>
            <div className="space-y-1 text-xs">
              <Row k="人工分" v={String(corr.manualScore)} mono />
              <Row k="修正人" v={corr.reviewer} />
              <Row k="时间" v={corr.createdAt} mono />
              <Row k="理由" v={corr.reason} />
            </div>
          </div>
        )}

        {order && (
          <div>
            <label className="mb-1 block text-[11px] font-600 text-ink-500">
              处理状态 · 手动更新
            </label>
            <div className="flex flex-wrap gap-1">
              {(['processed', 'needs_evidence', 'conflict', 'pending'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => markStatus(order.orderId, st)}
                  className={`rounded-[3px] border px-2 py-1 text-[10px] transition ${
                    order.status === st
                      ? 'border-dossier bg-dossier/10 text-dossier'
                      : 'border-ink-900/15 text-ink-500 hover:bg-paper-200/60'
                  }`}
                >
                  {labelOf(st)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const LABELS: Record<string, string> = {
  processed: '已处理',
  needs_evidence: '待补证据',
  conflict: '标签冲突',
  pending: '待处理',
}
function labelOf(s: string) {
  return LABELS[s] ?? s
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-14 shrink-0 text-ink-400">{k}</span>
      <span className={`flex-1 text-ink-700 ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  )
}
