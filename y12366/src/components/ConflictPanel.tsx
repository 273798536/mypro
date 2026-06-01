import { useState } from 'react'
import { ChevronUp, ChevronDown, Clock, CameraOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeismicStore } from '@/store/useSeismicStore'
import type { ConflictType, Severity } from '@/types'

const SEVERITY_COLORS: Record<Severity, string> = {
  high: '#EF4444',
  medium: '#F97316',
  low: '#EAB308',
}

const SEVERITY_BORDER: Record<Severity, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-orange-500',
  low: 'border-l-yellow-500',
}

const CONFLICT_ICONS: Record<ConflictType, typeof Clock> = {
  timestamp_drift: Clock,
  photo_missing: CameraOff,
  sensor_saturated_late: AlertTriangle,
}

export default function ConflictPanel() {
  const [expanded, setExpanded] = useState(false)
  const conflicts = useSeismicStore((s) => s.conflicts)
  const updateConflictJudgment = useSeismicStore((s) => s.updateConflictJudgment)
  const updateConflictSeverity = useSeismicStore((s) => s.updateConflictSeverity)

  const count = conflicts.length

  return (
    <div className="rounded-lg border border-steel-700 bg-steel-900 shadow-lg">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-steel-800"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-slate-300">冲突日志</span>
          {count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/20 px-1.5 text-xs font-bold text-red-400">
              {count}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-steel-500" />
        ) : (
          <ChevronUp size={16} className="text-steel-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-steel-700 px-4 py-3">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <CheckCircle size={32} className="mb-2 text-signal/60" />
              <span className="text-sm">未检测到冲突</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {conflicts.map((conflict) => {
                const Icon = CONFLICT_ICONS[conflict.type]
                return (
                  <div
                    key={conflict.id}
                    className={cn(
                      'rounded-md border border-steel-700 border-l-4 bg-steel-800 p-3',
                      SEVERITY_BORDER[conflict.severity],
                    )}
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-300">{conflict.description}</span>
                      <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-steel-700 px-1.5 font-mono text-[10px] text-steel-400">
                        #{conflict.sequenceOrder + 1}
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-steel-500">严重度</span>
                      {(['high', 'medium', 'low'] as Severity[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateConflictSeverity(conflict.id, s)}
                          className={cn(
                            'h-3.5 w-3.5 rounded-full border transition-all',
                            conflict.severity === s
                              ? 'scale-125 border-white/40 shadow-[0_0_6px_rgba(255,255,255,0.2)]'
                              : 'border-transparent opacity-60 hover:opacity-100',
                          )}
                          style={{ backgroundColor: SEVERITY_COLORS[s] }}
                        />
                      ))}
                    </div>

                    <textarea
                      value={conflict.judgment}
                      onChange={(e) => updateConflictJudgment(conflict.id, e.target.value)}
                      placeholder="输入判定意见..."
                      rows={2}
                      className="w-full resize-none rounded border border-steel-600 bg-steel-900 px-2.5 py-1.5 text-xs text-slate-300 placeholder-steel-600 transition-colors focus:border-steel-500 focus:outline-none"
                    />

                    {conflict.judgmentAt && (
                      <span className="mt-1 block font-mono text-[10px] text-steel-600">
                        判定于 {new Date(conflict.judgmentAt).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
