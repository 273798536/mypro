import { Link2, X, FileText, Cpu, User, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SampleEvidence } from '@/types'
import { ScoreBar } from './ScoreBar'
import { prettyJson } from '@/lib/format'

interface EvidenceDrawerProps {
  sample: SampleEvidence | null
  onClose: () => void
}

export function EvidenceDrawer({ sample, onClose }: EvidenceDrawerProps) {
  if (!sample) return null
  const corr = sample.manualCorrection

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col animate-fade-up border-l border-ink-900/15 bg-paper-50 shadow-card">
        <header className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-600 tracking-wider text-ink-400">
                样本证据
              </span>
              <span className="font-mono text-xs text-dossier">{sample.sampleId}</span>
            </div>
            <h3 className="mt-0.5 font-serif text-base font-700 text-ink-900">
              {sample.studentName} · 作文取证
            </h3>
          </div>
          <button
            aria-label="关闭"
            className="text-ink-400 transition hover:text-ink-900"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <a
            href={sample.evidenceUrl}
            onClick={(e) => e.preventDefault()}
            className="flex items-center justify-between rounded-md border border-dossier/30 bg-dossier/5 px-3 py-2 text-xs text-dossier transition hover:bg-dossier/10"
          >
            <span className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              点回样本证据 · 原始存证
            </span>
            <span className="font-mono text-[10px] text-dossier/70">{sample.evidenceUrl}</span>
          </a>

          {sample.hasLabelConflict && (
            <div className="flex items-start gap-2 rounded-md border border-forensic/40 bg-forensic/5 px-3 py-2.5 text-xs text-forensicDark">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-600">标签冲突 · 已隔离</div>
                <p className="mt-0.5 text-forensicDark/80">{sample.conflictNote}</p>
              </div>
            </div>
          )}

          <Block icon={<FileText className="h-3.5 w-3.5" />} title="题目">
            <p className="text-sm leading-relaxed text-ink-700">{sample.prompt}</p>
          </Block>

          <Block icon={<User className="h-3.5 w-3.5" />} title="学生作答 · 作文原文">
            <div className="field-rule max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-ink-900/10 bg-paper-100/50 p-3 font-serif text-[13px] leading-[1.85rem] text-ink-900">
              {sample.essay}
            </div>
          </Block>

          <Block icon={<Cpu className="h-3.5 w-3.5" />} title="机器评分 vs 人工改判">
            <ScoreBar machine={sample.machineScore} manual={corr?.manualScore} />
            {corr && (
              <div className="mt-3 space-y-1.5 rounded-md border border-ink-900/10 bg-paper-100/60 p-3 text-xs">
                <Row k="修正人" v={corr.reviewer} />
                <Row k="修正时间" v={corr.createdAt} mono />
                <Row k="修正理由" v={corr.reason} />
                {corr.overwritten && (
                  <div className="mt-1 flex items-center gap-1 font-600 text-forensic">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-forensic" />
                    注意：该人工修正曾被新结果盖掉
                  </div>
                )}
              </div>
            )}
          </Block>

          <Block icon={<Cpu className="h-3.5 w-3.5" />} title="接口返回（机器批改）">
            <pre className="max-h-60 overflow-auto rounded-md border border-ink-900/10 bg-ink-900/95 p-3 font-mono text-[11px] leading-relaxed text-paper-100">
              {prettyJson(sample.response.payload)}
            </pre>
          </Block>
        </div>
      </aside>
    </div>
  )
}

function Block({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-600 uppercase tracking-wider text-ink-400">
        {icon}
        {title}
      </div>
      {children}
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
