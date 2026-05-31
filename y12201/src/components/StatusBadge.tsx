import { cn } from '@/lib/utils'

type StatusType = 'normal' | 'adjusted' | 'exception' | 'pending' | 'confirmed' | 'rejected' | 'matched' | 'variance'

const STATUS_CONFIG: Record<StatusType, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  adjusted: { label: '已调整', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  exception: { label: '异常', className: 'bg-coral-50 text-coral-600 border-coral-200' },
  pending: { label: '待处理', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed: { label: '已确认', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rejected: { label: '已驳回', className: 'bg-coral-50 text-coral-600 border-coral-200' },
  matched: { label: '匹配', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  variance: { label: '有差异', className: 'bg-amber-50 text-amber-600 border-amber-200' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusType] || {
    label: status,
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
