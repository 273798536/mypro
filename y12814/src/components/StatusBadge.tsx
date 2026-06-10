import { SampleStatus } from "@/types"

interface StatusBadgeProps {
  status: SampleStatus
}

const config: Record<SampleStatus, { label: string; bg: string; text: string; glow: string }> = {
  pass: {
    label: "通过",
    bg: "rgba(52, 211, 153, 0.15)",
    text: "var(--color-emerald-pass)",
    glow: "glow-pass",
  },
  pending: {
    label: "待确认",
    bg: "rgba(251, 191, 36, 0.15)",
    text: "var(--color-amber-pending)",
    glow: "glow-pending",
  },
  bad: {
    label: "坏数据",
    bg: "rgba(239, 68, 68, 0.15)",
    text: "var(--color-red-bad)",
    glow: "glow-bad",
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${c.glow}`}
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  )
}
