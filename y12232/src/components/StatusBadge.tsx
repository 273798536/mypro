import { cn } from '@/lib/utils'
import type { VerifyStatus } from '@/types'

const statusConfig: Record<VerifyStatus, { label: string; className: string }> = {
  pending: { label: '待核验', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  verifying: { label: '核验中', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  toReview: { label: '待复核', className: 'bg-warning-light/40 text-warning-dark border-warning/30' },
  passed: { label: '已通过', className: 'bg-success-light/40 text-success-dark border-success/30' },
  rejected: { label: '已驳回', className: 'bg-danger-light/40 text-danger-dark border-danger/30' },
}

interface StatusBadgeProps {
  status: VerifyStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors duration-300',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
