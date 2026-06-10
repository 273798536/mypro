import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { useTiterStore } from "@/store"

export default function StatCards() {
  const { currentBatch, getBatchSummary } = useTiterStore()
  const summary = getBatchSummary(currentBatch)

  const cards = [
    {
      label: "样本总数",
      value: summary.total,
      icon: null,
      color: "var(--color-amber-accent)",
      bg: "rgba(232, 168, 56, 0.08)",
    },
    {
      label: "通过",
      value: summary.passCount,
      icon: CheckCircle,
      color: "var(--color-emerald-pass)",
      bg: "rgba(52, 211, 153, 0.08)",
    },
    {
      label: "待确认",
      value: summary.pendingCount,
      icon: AlertTriangle,
      color: "var(--color-amber-pending)",
      bg: "rgba(251, 191, 36, 0.08)",
    },
    {
      label: "坏数据",
      value: summary.badCount,
      icon: XCircle,
      color: "var(--color-red-bad)",
      bg: "rgba(239, 68, 68, 0.08)",
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-lg px-4 py-3"
            style={{
              background: card.bg,
              border: `1px solid ${card.color}22`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {card.label}
              </span>
              {Icon && <Icon size={14} style={{ color: card.color }} />}
            </div>
            <p className="font-mono text-2xl font-bold mt-1" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
