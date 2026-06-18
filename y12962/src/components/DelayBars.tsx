import { cn } from '@/lib/utils'
import type { DelayMetric } from '@shared/types'

interface DelayBarsProps {
  delays: DelayMetric[]
}

export function DelayBars({ delays }: DelayBarsProps) {
  const max = Math.max(1, ...delays.map((d) => d.delaySeconds))
  const sorted = [...delays].sort((a, b) => b.delaySeconds - a.delaySeconds)
  return (
    <div className="flex flex-col gap-2.5">
      {sorted.length === 0 && <div className="px-1 py-6 text-center text-xs text-ink-500">本批无延迟采集数据</div>}
      {sorted.map((d) => {
        const over = d.delaySeconds > d.thresholdSeconds
        const pct = Math.min(100, (d.delaySeconds / max) * 100)
        return (
          <div key={d.id} className="group flex items-center gap-3">
            <div className="mono w-44 shrink-0 truncate text-xs text-ink-300" title={d.dbInstance}>{d.dbInstance}</div>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-ink-850">
              <div
                className={cn(
                  'h-full rounded transition-all duration-500',
                  over ? 'bg-gradient-to-r from-signal-rose/80 to-signal-rose/40' : 'bg-gradient-to-r from-signal-emerald/70 to-signal-sky/40',
                )}
                style={{ width: `${Math.max(4, pct)}%` }}
              />
              <div className="absolute inset-y-0 left-[60%] w-px bg-ink-600/60" title="阈值参考位" />
              <div className="mono absolute inset-y-0 right-2 flex items-center text-[11px] text-ink-300">{d.delaySeconds.toFixed(1)}s</div>
            </div>
            <div className="w-16 shrink-0 text-right">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', over ? 'bg-signal-rose/15 text-signal-rose' : 'bg-signal-emerald/15 text-signal-emerald')}>
                {over ? '超阈值' : '正常'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
