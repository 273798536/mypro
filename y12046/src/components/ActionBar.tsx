import { Shield, BarChart3, GitCompare, Send, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OperationType } from '@/data/scenarios'

interface ActionBarProps {
  onVerifyAuth: () => void
  onCheckSample: () => void
  onCompareTrack: () => void
  onSubmit: () => void
  completedOperations: Set<OperationType>
  disabled: boolean
}

const actions: { type: OperationType; label: string; icon: typeof Shield; variant: 'secondary' | 'primary' }[] = [
  { type: 'verify-auth', label: '验证授权', icon: Shield, variant: 'secondary' },
  { type: 'check-sample', label: '检查采样', icon: BarChart3, variant: 'secondary' },
  { type: 'compare-track', label: '比对曲目', icon: GitCompare, variant: 'secondary' },
  { type: 'submit', label: '提交结论', icon: Send, variant: 'primary' },
]

export default function ActionBar({
  onVerifyAuth,
  onCheckSample,
  onCompareTrack,
  onSubmit,
  completedOperations,
  disabled,
}: ActionBarProps) {
  const handlers: Record<OperationType, () => void> = {
    'verify-auth': onVerifyAuth,
    'check-sample': onCheckSample,
    'compare-track': onCompareTrack,
    submit: onSubmit,
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map(({ type, label, icon: Icon, variant }) => {
        const isCompleted = completedOperations.has(type) && type !== 'submit'
        const isDisabled = disabled || (isCompleted)

        return (
          <button
            key={type}
            onClick={handlers[type]}
            disabled={isDisabled}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-serif text-sm font-semibold transition-all duration-200',
              variant === 'primary' && !isDisabled && 'btn-primary',
              variant === 'primary' && isDisabled && 'px-4 py-2.5 rounded-lg bg-amber/30 text-ink-400 cursor-not-allowed',
              variant === 'secondary' && !isCompleted && !disabled && 'btn-secondary',
              variant === 'secondary' && (isCompleted || disabled) && 'px-4 py-2.5 rounded-lg bg-ink-800 text-ink-500 border border-ink-700 cursor-not-allowed',
              isCompleted && 'opacity-60'
            )}
          >
            {isCompleted ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
