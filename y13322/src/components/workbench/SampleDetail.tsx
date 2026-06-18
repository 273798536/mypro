import { FileText, Link2, ShieldAlert, Cpu } from 'lucide-react'
import type { SampleEvidence } from '@/types'
import { ScoreBar } from '@/components/ScoreBar'
import { StatusStamp } from '@/components/StatusStamp'

interface SampleDetailProps {
  sample: SampleEvidence | null
  onOpenEvidence: (sample: SampleEvidence) => void
}

export function SampleDetail({ sample, onOpenEvidence }: SampleDetailProps) {
  if (!sample) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-400">
        请从左侧工单选择一条样本查看证据
      </div>
    )
  }

  const corr = sample.manualCorrection
  const orderStatus = sample.hasLabelConflict ? 'conflict' : corr ? 'processed' : 'pending'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-900/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-600 text-dossier">
                {sample.sampleId}
              </span>
              <span className="text-ink-400">·</span>
              <span className="text-xs text-ink-500">{sample.studentName}</span>
            </div>
            <p className="mt-1 text-sm text-ink-700">{sample.prompt}</p>
          </div>
          <StatusStamp status={orderStatus} />
        </div>

        <button
          onClick={() => onOpenEvidence(sample)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-[3px] border border-dossier/40 bg-dossier/5 px-3 py-1.5 text-xs font-600 text-dossier transition hover:bg-dossier/10"
        >
          <Link2 className="h-3.5 w-3.5" />
          点回样本证据
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {sample.hasLabelConflict && (
          <div className="flex items-start gap-2 rounded-md border border-forensic/40 bg-forensic/5 px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-forensic" />
            <div className="text-xs">
              <div className="font-600 text-forensic">标签冲突 · 已隔离，不揉进正常结果</div>
              <p className="mt-0.5 text-forensicDark/80">{sample.conflictNote}</p>
            </div>
          </div>
        )}

        <div className="rounded-md border border-ink-900/10 bg-paper-100/50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-600 uppercase tracking-wider text-ink-400">
            <Cpu className="h-3.5 w-3.5" />
            机器评分 vs 人工改判
          </div>
          <ScoreBar machine={sample.machineScore} manual={corr?.manualScore} />
          {corr && (
            <div className="mt-3 space-y-1 border-t border-ink-900/10 pt-3 text-xs">
              <Row k="修正人" v={corr.reviewer} />
              <Row k="修正时间" v={corr.createdAt} mono />
              <Row k="修正理由" v={corr.reason} />
              {corr.overwritten && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-[3px] bg-forensic/10 px-1.5 py-0.5 font-600 text-forensic">
                  <span className="inline-block h-1 w-1 rounded-full bg-forensic" />
                  人工修正曾被新结果盖掉
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-600 uppercase tracking-wider text-ink-400">
            <FileText className="h-3.5 w-3.5" />
            作文原文（预览）
          </div>
          <div className="field-rule max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-ink-900/10 bg-paper-100/50 p-3 font-serif text-[13px] leading-[1.85rem] text-ink-900">
            {sample.essay}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-ink-400">{k}</span>
      <span className={`flex-1 text-ink-700 ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  )
}
