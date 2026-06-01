import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: '待复核',
    className: 'bg-amber-500/20 text-amber-500',
  },
  anomaly: {
    label: '异常',
    className: 'bg-red-500/20 text-red-500',
  },
  completed: {
    label: '已完成',
    className: 'bg-emerald-500/20 text-emerald-500',
  },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-500/20 text-slate-400' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
