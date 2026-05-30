import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OperationLog, OperationType } from '@/data/scenarios'

const operationLabels: Record<OperationType, string> = {
  'verify-auth': '验证授权',
  'check-sample': '检查采样',
  'compare-track': '比对曲目',
  'submit': '提交结论',
}

interface StepTimelineProps {
  operations: OperationLog[]
  currentScenarioId: string
}

export default function StepTimeline({ operations, currentScenarioId }: StepTimelineProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const filtered = operations.filter((op) => op.scenarioId === currentScenarioId)

  function toggle(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center text-ink-300 font-serif">
        暂无操作记录
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-ink-600" />
      {filtered.map((op, index) => {
        const isOpen = expanded.has(index)
        const isCorrect = op.isCorrect
        return (
          <div key={index} className="relative mb-4 last:mb-0">
            <div
              className={cn(
                'absolute left-[-14px] top-2 h-[10px] w-[10px] rounded-full border-2',
                isCorrect
                  ? 'bg-success border-success'
                  : 'bg-danger border-danger'
              )}
            />
            <button
              onClick={() => toggle(index)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-ink-300" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-300" />
                )}
                <span className="text-ink-200 text-xs font-mono">
                  第{index + 1}步
                </span>
                <span className="text-parchment-100 font-serif text-sm">
                  {operationLabels[op.operationType]}
                </span>
                <span
                  className={cn(
                    'ml-auto text-sm font-mono font-semibold',
                    op.scoreDelta > 0 ? 'text-success' : op.scoreDelta < 0 ? 'text-danger' : 'text-ink-300'
                  )}
                >
                  {op.scoreDelta > 0 ? '+' : ''}{op.scoreDelta}
                </span>
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger" />
                )}
              </div>
              <p className="mt-1 text-ink-300 text-xs font-serif pl-6">
                {op.result}
              </p>
            </button>
            {isOpen && op.reasoningImpact.length > 0 && (
              <div className="mt-2 ml-6 space-y-1 animate-fade-in">
                {op.reasoningImpact.map((impact, i) => (
                  <div
                    key={i}
                    className="text-xs text-ink-200 bg-ink-800 rounded px-2 py-1 font-serif"
                  >
                    {impact}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
