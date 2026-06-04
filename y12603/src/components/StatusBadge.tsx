import { cn } from "@/lib/utils"

type DefectStatus = "pending" | "approved" | "rejected" | "resolved"
type BadgeSize = "sm" | "lg"

const STATUS_CONFIG: Record<DefectStatus, { label: string; className: string }> = {
  pending: { label: "待确认", className: "bg-warn text-white" },
  approved: { label: "已通过", className: "bg-pass text-white" },
  rejected: { label: "已驳回", className: "bg-danger text-white" },
  resolved: { label: "已处理", className: "bg-muted text-white" },
}

const SIZE_MAP: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
}

interface StatusBadgeProps {
  status: DefectStatus
  size?: BadgeSize
  className?: string
}

export default function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.className,
        SIZE_MAP[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
