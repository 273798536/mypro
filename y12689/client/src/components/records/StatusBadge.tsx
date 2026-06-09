import type { RecordStatus } from '@/types'

interface StatusBadgeProps {
  status: RecordStatus
}

const statusConfig: Record<RecordStatus, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-primary/20 text-primary border-primary/40',
  },
  passed: {
    label: '已通过',
    className: 'bg-success/20 text-success border-success/40',
  },
  review: {
    label: '待复核',
    className: 'bg-warning/20 text-warning border-warning/40',
  },
  failed: {
    label: '不合格',
    className: 'bg-danger/20 text-danger border-danger/40',
  },
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export default StatusBadge
