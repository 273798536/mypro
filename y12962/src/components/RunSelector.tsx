import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shortRun, formatTime } from '@/lib/ui'
import type { RunRecord } from '@shared/types'

interface RunSelectorProps {
  runs: RunRecord[]
  current: RunRecord | null
  previous: RunRecord | null
  onSelect: (runId: string) => void
}

export function RunSelector({ runs, current, previous, onSelect }: RunSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-left transition-colors hover:border-ink-600"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-xs text-signal-sky">{current ? shortRun(current.runId) : '—'}</span>
            {current && previous && current.runId !== previous.runId && (
              <span className="rounded bg-signal-emerald/15 px-1.5 py-0.5 text-[10px] font-semibold text-signal-emerald">本次</span>
            )}
          </div>
          <div className="text-[11px] text-ink-500">{current ? formatTime(current.startedAt) : '无运行'}</div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-xl">
          {runs.length === 0 && <div className="px-3 py-3 text-xs text-ink-500">暂无运行记录</div>}
          {runs.map((r) => {
            const isCurrent = current?.runId === r.runId
            const isPrevious = previous?.runId === r.runId
            return (
              <button
                key={r.runId}
                onClick={() => { onSelect(r.runId); setOpen(false) }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-ink-850',
                  isCurrent && 'bg-signal-sky/10',
                )}
              >
                <div className="min-w-0">
                  <div className="mono text-xs text-ink-300">{shortRun(r.runId)}</div>
                  <div className="text-[11px] text-ink-500">{formatTime(r.startedAt)} · 异常 {r.issueCount}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isPrevious && !isCurrent && <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-ink-300">上次</span>}
                  {isCurrent && <Check className="h-3.5 w-3.5 text-signal-sky" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
