export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: '待审核', cls: 'bg-museum-orange/20 text-museum-orange' },
    reviewed: { label: '已审核', cls: 'bg-museum-green/20 text-museum-green' },
    rejudged: { label: '已重审', cls: 'bg-museum-amber/20 text-museum-amber' },
    resolved: { label: '已解决', cls: 'bg-museum-green/20 text-museum-green' },
  }
  const item = map[status] || { label: status, cls: 'bg-museum-card text-museum-textMuted' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  )
}
