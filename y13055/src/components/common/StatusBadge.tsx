import type { ReviewStatus } from '@/types'

interface StatusBadgeProps {
  status: ReviewStatus
}

const statusConfig = {
  pending: {
    label: '待复核',
    className: 'bg-blue-100 text-blue-800'
  },
  need_evidence: {
    label: '需补证据',
    className: 'bg-orange-100 text-orange-800'
  },
  reviewed: {
    label: '已复核',
    className: 'bg-green-100 text-green-800'
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
