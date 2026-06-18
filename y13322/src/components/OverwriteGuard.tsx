import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'

export function OverwriteGuard() {
  const { guardOpen, guardSampleId, samples, resolveOverwrite } = useReviewStore()
  if (!guardOpen || !guardSampleId) return null

  const sample = samples.find((s) => s.sampleId === guardSampleId)
  const existing = sample?.manualCorrection
  if (!sample || !existing) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={() => resolveOverwrite(guardSampleId, false)}
      />
      <div className="dossier-surface relative w-full max-w-lg animate-stamp-in rounded-md border-2 border-forensic/60 bg-paper-50 p-6 shadow-card">
        <button
          aria-label="关闭"
          className="absolute right-4 top-4 text-ink-400 transition hover:text-ink-900"
          onClick={() => resolveOverwrite(guardSampleId, false)}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-forensic/10 text-forensic">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="stamp border-forensic text-forensic">覆盖保护</span>
              <span className="font-mono text-[11px] text-ink-400">
                {sample.sampleId}
              </span>
            </div>
            <h3 className="font-serif text-lg font-700 text-ink-900">
              新结果将盖掉既有的人工修正
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              该样本已存在人工改判（{existing.reviewer} ·
              <span className="font-mono"> {existing.manualScore}</span> 分）。
              当前录入与原机器分方向不一致或差距≥3分，若继续将覆盖人工修正。
              请确认如何处置。
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 rounded-md border border-ink-900/10 bg-paper-100/60 p-3 text-center font-mono text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400">机器分</div>
            <div className="text-lg font-700 text-dossier">{sample.machineScore}</div>
          </div>
          <div className="border-x border-ink-900/10">
            <div className="text-[10px] uppercase tracking-wider text-ink-400">现有人工分</div>
            <div className="text-lg font-700 text-verified">{existing.manualScore}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400">新录入</div>
            <div className="text-lg font-700 text-forensic">待定</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="rounded-[3px] border border-ink-900/20 bg-paper-50 px-4 py-2 text-sm font-500 text-ink-700 transition hover:bg-paper-200"
            onClick={() => resolveOverwrite(guardSampleId, false)}
          >
            放弃新录入
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-verified px-4 py-2 text-sm font-600 text-paper-50 transition hover:bg-verified/90"
            onClick={() => resolveOverwrite(guardSampleId, true)}
          >
            <ShieldCheck className="h-4 w-4" />
            保留人工修正
          </button>
        </div>
      </div>
    </div>
  )
}
