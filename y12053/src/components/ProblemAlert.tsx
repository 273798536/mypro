import type { ProblemConfig } from '@/types'
import { useGameStore } from '@/store/gameStore'

const severityStyles: Record<string, { bg: string; border: string; text: string; animClass: string }> = {
  error: {
    bg: 'bg-[var(--color-error)]/15',
    border: 'border-[var(--color-error)]/60',
    text: 'text-[var(--color-error)]',
    animClass: 'animate-blink-error',
  },
  warning: {
    bg: 'bg-[var(--color-warning)]/15',
    border: 'border-[var(--color-warning)]/60',
    text: 'text-[var(--color-warning)]',
    animClass: 'animate-pulse-warning',
  },
  info: {
    bg: 'bg-[var(--color-info)]/15',
    border: 'border-[var(--color-info)]/60',
    text: 'text-[var(--color-info)]',
    animClass: '',
  },
}

export default function ProblemAlert() {
  const { activeProblem, dismissProblem, triggeredProblems } = useGameStore()

  if (!activeProblem) return null

  const style = severityStyles[activeProblem.severity] || severityStyles.info

  return (
    <div className="animate-slide-in">
      <div className={`p-4 border-2 rounded-lg ${style.bg} ${style.border} ${style.animClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className={`text-sm font-bold mb-1 ${style.text}`}>
              {activeProblem.title}
            </div>
            <div className="text-xs text-[var(--color-text)] mb-2">
              {activeProblem.description}
            </div>
            <div className="text-xs p-2 rounded bg-[var(--color-bg)]/60 border border-[var(--color-border)]">
              <span className="text-[var(--color-text-dim)]">📍 问题来源：</span>
              <span className={`font-semibold ${style.text}`}>{activeProblem.sourceMaterial}</span>
            </div>
          </div>
          <button
            onClick={dismissProblem}
            className="text-xs px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-light)] text-[var(--color-text-dim)] whitespace-nowrap transition-colors"
          >
            知道了
          </button>
        </div>

        {triggeredProblems.length > 1 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {triggeredProblems.map((p, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  p === activeProblem
                    ? `${severityStyles[p.severity].border} ${severityStyles[p.severity].text}`
                    : 'border-[var(--color-border)] text-[var(--color-text-dim)]'
                }`}
              >
                {p.type === 'insufficient_funds' ? '冻资不足' :
                 p.type === 'refund_delay' ? '退款延迟' :
                 p.type === 'missing_column' ? '中签号缺列' :
                 p.type === 'fee_delay' ? '手续费晚到' : p.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
