import { cn } from '@/lib/utils'
import type { QCMetric, StatusType } from '@/types'
import StatusBadge from './StatusBadge'

interface QCCardProps {
  metric: QCMetric
  className?: string
}

const statusColors: Record<StatusType, string> = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  pending: '#64748b',
}

export default function QCCard({ metric, className }: QCCardProps) {
  const { name, value, unit, status, threshold } = metric

  const min = threshold.min ?? 0
  const max = threshold.max ?? 100
  const range = max - min
  const clampedValue = Math.min(Math.max(value, min), max)
  const percentage = ((clampedValue - min) / range) * 100

  const color = statusColors[status]
  const strokeDasharray = `${percentage * 2.51} 251`
  const circumference = 2 * Math.PI * 40

  return (
    <div
      className={cn(
        'glass-card p-5 transition-all duration-300 hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/10 cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-lab-200 mb-1">{name}</h3>
          <div className="flex items-baseline gap-1 mt-2">
            <span
              className="text-3xl font-bold font-mono"
              style={{ color }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm text-lab-400 ml-1">{unit}</span>
            )}
          </div>
          <div className="mt-3">
            <StatusBadge status={status} size="sm" />
          </div>
        </div>

        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (percentage / 100) * circumference}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-lab-300 font-medium">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex justify-between text-xs text-lab-400">
          <span>
            阈值: {threshold.min ?? '-'} ~ {threshold.max ?? '-'}
            {unit}
          </span>
          {threshold.warningMin !== undefined || threshold.warningMax !== undefined ? (
            <span>
              警戒: {threshold.warningMin ?? '-'} ~ {threshold.warningMax ?? '-'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
