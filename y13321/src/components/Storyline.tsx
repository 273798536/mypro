import type { VersionEvent } from '@/data/types'
import { Badge } from './Badge'

const STAGE_META: Record<
  VersionEvent['stage'],
  { title: string; tone: 'neutral' | 'manual' | 'change'; dot: string }
> = {
  old: { title: '旧模型判定', tone: 'neutral', dot: 'bg-ink-500' },
  manual: { title: '人工修正', tone: 'manual', dot: 'bg-manual' },
  new: { title: '新模型判定', tone: 'change', dot: 'bg-change' },
}

export function Storyline({ events }: { events: VersionEvent[] }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const meta = STAGE_META[e.stage]
        const last = i === events.length - 1
        return (
          <li key={`${e.stage}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span className="absolute left-[7px] top-4 h-[calc(100%-1rem)] w-px bg-ink-900/15" />
            )}
            <span className={`relative z-10 mt-1 h-3.5 w-3.5 flex-none rounded-full ring-4 ring-paper-50 ${meta.dot}`} />
            <div className="min-w-0 flex-1 animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-900">{meta.title}</span>
                <span className="num text-[11px] text-ink-400">{e.actor}</span>
                <span className="num text-[11px] text-ink-400">· {e.ts.slice(0, 16).replace('T', ' ')}</span>
                <Badge tone={meta.tone}>
                  <span className="num">{e.score}</span>
                  <span className="opacity-60">/50</span>
                  <span className="ml-0.5 opacity-80">{e.band}</span>
                </Badge>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{e.rationale}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
