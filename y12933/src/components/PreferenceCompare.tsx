import { User, Cpu, AlertTriangle } from 'lucide-react'
import type { ReviewRow } from '../../shared/types'
import { cn } from '@/lib/utils'

const LABEL_TEXT: Record<string, string> = { a: 'A', b: 'B', tie: '平局' }

export function PreferenceCompare({ row }: { row: ReviewRow }) {
  const disagreement = row.has_disagreement
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Prompt
        </div>
        <p className="text-sm leading-relaxed text-zinc-200">{row.prompt}</p>
      </div>

      {disagreement && (
        <div className="flex items-center gap-2 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-signal">
          <AlertTriangle className="h-3.5 w-3.5" />
          奖励模型预测与人工标注存在分歧，需重点复核
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['a', 'b'] as const).map((side) => {
          const text = side === 'a' ? row.response_a : row.response_b
          const humanPick = row.human_label === side
          const rmPick = row.rm_prediction === side
          return (
            <div
              key={side}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                humanPick
                  ? 'border-pass/40 bg-pass/[0.06]'
                  : rmPick
                    ? 'border-signal/40 bg-signal/[0.06]'
                    : 'border-white/5 bg-ink-900/40',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-zinc-300">
                  Response {LABEL_TEXT[side]}
                </span>
                <div className="flex items-center gap-1.5">
                  <Tag active={humanPick} icon={User} label={`人工 ${LABEL_TEXT[side]}`} color="pass" />
                  <Tag active={!!rmPick} icon={Cpu} label={`RM ${LABEL_TEXT[side]}`} color="signal" />
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
            </div>
          )
        })}
      </div>

      {row.human_label === 'tie' && (
        <div className="text-center text-xs text-zinc-500">人工标注：平局</div>
      )}
    </div>
  )
}

function Tag({
  active,
  icon: Icon,
  label,
  color,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: 'pass' | 'signal'
}) {
  const COLOR = color === 'pass' ? 'text-pass' : 'text-signal'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] transition-opacity',
        active ? `${COLOR} opacity-100` : 'text-zinc-600 opacity-60',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
