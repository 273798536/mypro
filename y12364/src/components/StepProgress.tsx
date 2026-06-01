import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = ['待录入', '待复核', '异常处理', '已完成']

const statusStepMap: Record<string, number> = {
  pending_review: 1,
  anomaly: 2,
  completed: 3,
}

interface StepProgressProps {
  status: string
  className?: string
}

export default function StepProgress({ status, className }: StepProgressProps) {
  const currentStep = statusStepMap[status] ?? 0

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep

        return (
          <div key={label} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'w-12 h-0.5',
                  idx <= currentStep ? 'bg-amber-500' : 'bg-slate-600'
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2',
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
                )}
              >
                {isCompleted ? <Check size={14} /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isCurrent ? 'text-amber-500 font-medium' : isCompleted ? 'text-emerald-500' : 'text-slate-500'
                )}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
