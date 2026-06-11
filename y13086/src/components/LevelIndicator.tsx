export default function LevelIndicator({ level }: { level: string }) {
  const map: Record<string, { label: string; dotCls: string; extra?: string }> = {
    none: { label: '无', dotCls: 'bg-museum-textDim' },
    low: { label: '低', dotCls: 'bg-museum-green' },
    medium: { label: '中', dotCls: 'bg-museum-orange' },
    high: { label: '高', dotCls: 'bg-museum-red', extra: 'animate-pulse-soft' },
  }
  const item = map[level] || { label: level, dotCls: 'bg-museum-textDim' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-museum-textMuted">
      <span className={`w-2 h-2 rounded-full ${item.dotCls} ${item.extra || ''}`} />
      {item.label}
    </span>
  )
}
