import { cn } from '@/lib/utils'
import type { PlaybackStatus } from '@/shared/types'

interface StatusBadgeProps {
  status: PlaybackStatus
  className?: string
}

const statusConfig: Record<
  PlaybackStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '待处理',
    className:
      'bg-amber-50 text-amber-700 border-amber-200',
  },
  rejudged: {
    label: '已改判',
    className:
      'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: '已确认',
    className:
      'bg-green-50 text-green-700 border-green-200',
  },
}

export default function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
