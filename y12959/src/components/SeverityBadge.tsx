import { cn } from '@/lib/utils'
import type { ConflictSeverity } from '../types'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface SeverityBadgeProps {
  severity: ConflictSeverity
  showDescription?: boolean
  className?: string
}

const severityConfig: Record<ConflictSeverity, {
  label: string
  description: string
  bgClass: string
  textClass: string
  iconClass: string
  borderClass: string
  dotClass: string
}> = {
  critical: {
    label: '高危',
    description: '可能导致数据严重不一致，需立即处理（2小时内）',
    bgClass: 'bg-danger-50',
    textClass: 'text-danger-700',
    iconClass: 'text-danger-600',
    borderClass: 'border-danger-200',
    dotClass: 'bg-danger-600',
  },
  warning: {
    label: '中危',
    description: '存在潜在风险，建议尽快核查（当日内）',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
  },
  info: {
    label: '提示',
    description: '幂等系统按预期拦截，无数据风险，可按计划处理（3日内）',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    iconClass: 'text-sky-600',
    borderClass: 'border-sky-200',
    dotClass: 'border-2 border-sky-500 bg-transparent',
  },
}

export default function SeverityBadge({ severity, showDescription = false, className }: SeverityBadgeProps) {
  const config = severityConfig[severity]

  const renderDot = () => {
    if (severity === 'critical') {
      return <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', config.iconClass)} fill="currentColor" />
    }
    if (severity === 'warning') {
      return (
        <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rotate-45', config.dotClass)} />
      )
    }
    return <Info className={cn('h-3.5 w-3.5 shrink-0', config.iconClass)} />
  }

  if (showDescription) {
    return (
      <div
        className={cn(
          'inline-flex items-start gap-2 rounded-md border px-2.5 py-1.5',
          config.bgClass,
          config.borderClass,
          className
        )}
      >
        <span className="mt-0.5">{renderDot()}</span>
        <div className="flex flex-col">
          <span className={cn('text-xs font-semibold', config.textClass)}>{config.label}</span>
          <span className={cn('text-[11px] leading-tight mt-0.5', config.textClass, 'opacity-80')}>
            {config.description}
          </span>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
      title={config.description}
    >
      {renderDot()}
      {config.label}
    </span>
  )
}
