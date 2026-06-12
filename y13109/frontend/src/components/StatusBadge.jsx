export default function StatusBadge({ status }) {
  const statusMap = {
    pending: { text: '待计算', className: 'status-pending' },
    normal: { text: '正常', className: 'status-normal' },
    empty: { text: '空集合', className: 'status-empty' },
    singular: { text: '奇异矩阵', className: 'status-singular' },
    out_of_bound: { text: '越界', className: 'status-out_of_bound' },
    overridden: { text: '人工改判', className: 'status-overridden' },
    error: { text: '错误', className: 'status-out_of_bound' }
  }

  const info = statusMap[status] || { text: status, className: 'status-pending' }

  return (
    <span className={`status-badge ${info.className}`}>
      {info.text}
    </span>
  )
}
