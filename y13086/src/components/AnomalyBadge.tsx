export default function AnomalyBadge({ anomalyType }: { anomalyType: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    normal: { label: '正常', cls: 'bg-museum-green/20 text-museum-green' },
    flicker: { label: '灯光闪烁', cls: 'bg-museum-red/20 text-museum-red' },
    brightness_abnormal: { label: '亮度异常', cls: 'bg-museum-orange/20 text-museum-orange' },
    off_schedule: { label: '非计划时段', cls: 'bg-museum-amber/20 text-museum-amber' },
    mixed_unit: { label: '混合单位', cls: 'bg-museum-purple/20 text-museum-purple' },
  }
  const item = map[anomalyType] || { label: anomalyType, cls: 'bg-museum-card text-museum-textMuted' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  )
}
