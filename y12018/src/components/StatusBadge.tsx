import type { DistributionStatus } from '../../shared/types'

export function StatusBadge({ status }: { status: DistributionStatus }) {
  const config: Record<DistributionStatus, { label: string; className: string }> = {
    pending: { label: '待发放', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    paid: { label: '已发放', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    failed: { label: '发放失败', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    disputed: { label: '有争议', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  }

  const { label, className } = config[status]

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${className}`}>
      {label}
    </span>
  )
}
