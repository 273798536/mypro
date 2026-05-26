import type { ParticipantStatus, BatchStatus } from '../../../shared/types'

interface StatusBadgeProps {
  status: ParticipantStatus | BatchStatus
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待计算', className: 'bg-slate-100 text-slate-700' },
  calculated: { label: '已计算', className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: '已确认', className: 'bg-green-100 text-green-700' },
  frozen: { label: '已冻结', className: 'bg-gray-100 text-gray-700' },
  refunded: { label: '已退款', className: 'bg-emerald-100 text-emerald-700' },
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-700' },
  executing: { label: '执行中', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-700' }
  
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  )
}
