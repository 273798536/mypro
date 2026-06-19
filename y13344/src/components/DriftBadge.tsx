import type { MetricValue } from "@/types"

interface DriftBadgeProps {
  metric: MetricValue
}

export default function DriftBadge({ metric }: DriftBadgeProps) {
  if (metric.isDrifted) {
    const driftPct = metric.driftRatio != null
      ? `${(Math.abs(metric.driftRatio) * 100).toFixed(1)}%`
      : ""
    const magnitude = metric.driftRatio != null
      ? Math.abs(metric.value - metric.threshold).toFixed(2)
      : ""

    return (
      <span
        title={`当前阈值: ${metric.threshold} | 漂移幅度: ${magnitude}`}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30"
      >
        漂移
        {driftPct && <span className="font-mono">{driftPct}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      正常
    </span>
  )
}
