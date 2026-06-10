import { cn } from '@/lib/utils'
import type { LineageStep } from '@/types'
import StatusBadge from '@/components/UI/StatusBadge'
import { User, Clock, Star } from 'lucide-react'

interface LineageNodeProps {
  step: LineageStep
  isActive?: boolean
  isLast?: boolean
  onClick?: () => void
  className?: string
}

const statusLineColors: Record<string, string> = {
  success: 'from-emerald-500 to-teal-400',
  warning: 'from-amber-500 to-orange-400',
  error: 'from-red-500 to-rose-400',
  info: 'from-sky-500 to-cyan-400',
  pending: 'from-slate-500 to-slate-400',
}

export default function LineageNode({
  step,
  isActive = false,
  isLast = false,
  onClick,
  className,
}: LineageNodeProps) {
  const lineGradient = statusLineColors[step.status] || statusLineColors.pending

  return (
    <div className="relative flex items-start">
      <div
        className={cn(
          'relative z-10 min-w-[200px] glass-card p-4 transition-all duration-300 cursor-pointer',
          isActive && 'ring-2 ring-teal-400/50 shadow-lg shadow-teal-500/20',
          step.isKey && 'border-amber-400/40',
          onClick && 'hover:bg-white/10 hover:scale-105 hover:shadow-xl',
          className
        )}
        onClick={onClick}
      >
        {step.isKey && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-3">
          <h4 className="text-sm font-semibold text-white leading-tight">
            {step.name}
          </h4>
          <StatusBadge status={step.status} size="sm" showIcon={false} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-lab-300">
            <Clock className="w-3.5 h-3.5 text-lab-400" />
            <span className="font-mono">{step.time}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-lab-300">
            <User className="w-3.5 h-3.5 text-lab-400" />
            <span>{step.operator}</span>
          </div>
        </div>

        {step.description && (
          <p className="mt-3 text-xs text-lab-400 line-clamp-2">
            {step.description}
          </p>
        )}
      </div>

      {!isLast && (
        <div className="absolute top-1/2 left-full -translate-y-1/2 w-12 h-0.5">
          <div
            className={cn(
              'w-full h-full bg-gradient-to-r',
              lineGradient,
              'opacity-60'
            )}
          />
          <div
            className={cn(
              'absolute top-1/2 right-0 w-2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r',
              lineGradient
            )}
          />
        </div>
      )}
    </div>
  )
}
