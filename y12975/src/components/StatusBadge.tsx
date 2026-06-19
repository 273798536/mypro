const map: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'badge-muted', label: '待处理' },
  corrected: { cls: 'badge-sky', label: '已修正' },
  reviewed: { cls: 'badge-lime', label: '已复核' },
  rolled_back: { cls: 'badge-coral', label: '已回滚' },
  confirmed: { cls: 'badge-lime', label: '已确认' },
  dismissed: { cls: 'badge-muted', label: '已忽略' },
}

export default function StatusBadge({ status }: { status: string }) {
  const s = map[status] || map.pending
  return (
    <span className={`${s.cls} inline-flex items-center px-2 py-0.5 rounded text-xs`}>
      {s.label}
    </span>
  )
}
