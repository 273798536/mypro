import { Upload, Edit3, Clock, ArrowRight } from 'lucide-react'
import { usePumpStore } from '@/store/usePumpStore'
import type { Correction, ImportBatch, ImportBatchType } from '@/types'

type TimelineItem =
  | { kind: 'import'; id: string; time: string; batch: ImportBatch }
  | { kind: 'correction'; id: string; time: string; correction: Correction }

const BATCH_TYPE_LABEL: Record<ImportBatchType, string> = {
  flow_and_diameter: '流量与管径',
  local_resistance: '局部阻力',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function buildTimeline(corrections: Correction[], importBatches: ImportBatch[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...importBatches.map(b => ({ kind: 'import' as const, id: b.id, time: b.importedAt, batch: b })),
    ...corrections.map(c => ({ kind: 'correction' as const, id: c.id, time: c.correctedAt, correction: c })),
  ]
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return items
}

function ImportNode({ batch }: { batch: ImportBatch }) {
  const label = BATCH_TYPE_LABEL[batch.batchType]
  return (
    <div className="space-y-1">
      <span className="label-text text-sm">导入: {label}</span>
      {batch.changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <span className="label-text">{c.fieldLabel}:</span>
          <span className="value-text line-through opacity-50">{String(c.oldValue)}</span>
          <ArrowRight className="w-3 h-3 text-amber-500" />
          <span className="value-unit text-amber-400 font-semibold">{String(c.newValue)}</span>
        </div>
      ))}
    </div>
  )
}

function CorrectionNode({ correction }: { correction: Correction }) {
  return (
    <div className="space-y-1">
      <span className="label-text text-sm">修正: {correction.fieldLabel}</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="value-text line-through opacity-50">{correction.oldValue}</span>
        <ArrowRight className="w-3 h-3 text-amber-500" />
        <span className="badge-warning px-1.5 py-0.5 rounded text-amber-400 font-semibold">
          {correction.newValue}
        </span>
      </div>
      <p className="text-xs text-navy-300 italic">原因: {correction.reason}</p>
    </div>
  )
}

export default function CorrectionTimeline() {
  const corrections = usePumpStore(s => s.corrections)
  const importBatches = usePumpStore(s => s.importBatches)
  const timeline = buildTimeline(corrections, importBatches)

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Clock className="h-10 w-10 text-navy-400/40" />
        <p className="text-sm text-navy-200/60">暂无修正或导入记录</p>
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-navy-600" />

      {timeline.map((item, idx) => {
        const isCurrent = idx === 0
        const dotClass = isCurrent
          ? 'w-3.5 h-3.5 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
          : 'w-3 h-3 bg-navy-500'

        return (
          <div key={item.id} className="relative pb-6 last:pb-0">
            <div
              className={`absolute -left-6 top-1.5 rounded-full ${dotClass}`}
              style={{ transform: isCurrent ? 'translateX(-1px)' : 'translateX(0)' }}
            />

            <div className="card p-3">
              <div className="flex items-center gap-2 mb-2">
                {item.kind === 'import' ? (
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="value-text text-xs opacity-70">
                  {formatTime(item.time)}
                </span>
                {isCurrent && (
                  <span className="badge-warning text-[10px] px-1.5 py-0.5 rounded ml-auto">
                    最新
                  </span>
                )}
              </div>

              {item.kind === 'import' ? (
                <ImportNode batch={item.batch} />
              ) : (
                <CorrectionNode correction={item.correction} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
