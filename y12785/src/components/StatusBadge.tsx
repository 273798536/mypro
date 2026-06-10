import { BatchStatus } from '@/store'

const statusLabelMap: Record<BatchStatus, string> = {
  imported: '已导入',
  analyzing: '分析中',
  pending_review: '待复核',
  approved: '已通过',
  rejected: '已驳回',
  exported: '已导出',
}

const statusStyleMap: Record<BatchStatus, string> = {
  imported: 'bg-gray-100 text-cool-gray',
  analyzing: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-coral-500/10 text-coral-500',
  exported: 'bg-indigo-900/10 text-indigo-900',
}

interface StatusBadgeProps {
  status: BatchStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyleMap[status]}`}
    >
      {statusLabelMap[status]}
    </span>
  )
}
