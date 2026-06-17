import type { RecordStatus } from '../types'

interface StatusBadgeProps {
  status: RecordStatus
  conflict?: boolean
  needMerge?: boolean
}

const statusMap: Record<RecordStatus, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'status-pending' },
  confirmed: { label: '已确认', className: 'status-confirmed' },
  withdrawn: { label: '已撤回', className: 'status-withdrawn' },
  need_material: { label: '待补材料', className: 'status-need-material' },
  manual_review: { label: '人工改判', className: 'status-manual' },
}

export function StatusBadge({ status, conflict, needMerge }: StatusBadgeProps) {
  const info = statusMap[status]
  return (
    <span className="status-badge-wrapper">
      <span className={`status-badge ${info.className}`}>
        {info.label}
      </span>
      {conflict && (
        <span className="status-tag tag-conflict">冲突待确认</span>
      )}
      {needMerge && (
        <span className="status-tag tag-merge">需归并</span>
      )}
    </span>
  )
}
