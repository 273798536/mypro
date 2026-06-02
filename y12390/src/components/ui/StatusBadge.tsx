import { cn } from '@/lib/utils'
import type { Anomaly } from '@/types'

type AnomalyStatus = Anomaly['status']
type AnomalySeverity = Anomaly['severity']

interface StatusBadgeProps {
  status?: AnomalyStatus
  severity?: AnomalySeverity
  className?: string
}

const statusConfig: Record<AnomalyStatus, { label: string; className: string }> = {
  open: { label: '待处理', className: 'bg-destructive/20 text-destructive' },
  acknowledged: { label: '已确认', className: 'bg-warning/20 text-warning' },
  resolved: { label: '已解决', className: 'bg-success/20 text-success' },
}

const severityConfig: Record<AnomalySeverity, { label: string; className: string }> = {
  critical: { label: '严重', className: 'bg-destructive/20 text-destructive' },
  warning: { label: '警告', className: 'bg-warning/20 text-warning' },
  info: { label: '信息', className: 'bg-primary/20 text-primary' },
}

export default function StatusBadge({ status, severity, className }: StatusBadgeProps) {
  if (status) {
    const config = statusConfig[status]
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          config.className,
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-red-500': status === 'open',
          'bg-amber-500': status === 'acknowledged',
          'bg-green-500': status === 'resolved',
        })} />
        {config.label}
      </span>
    )
  }

  if (severity) {
    const config = severityConfig[severity]
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          config.className,
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-red-500': severity === 'critical',
          'bg-amber-500': severity === 'warning',
          'bg-blue-500': severity === 'info',
        })} />
        {config.label}
      </span>
    )
  }

  return null
}
