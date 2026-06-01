import { FileEdit, CheckCircle, ShieldCheck, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecordStatus } from "@shared/types"

const statusConfig: Record<RecordStatus, { label: string; icon: React.ElementType; className: string }> = {
  draft: {
    label: "草稿",
    icon: FileEdit,
    className: "bg-gray-100 text-gray-700",
  },
  reviewed: {
    label: "已审核",
    icon: CheckCircle,
    className: "bg-blue-100 text-blue-700",
  },
  approved: {
    label: "已批准",
    icon: ShieldCheck,
    className: "bg-emerald-100 text-emerald-700",
  },
  archived: {
    label: "已归档",
    icon: Archive,
    className: "bg-slate-100 text-slate-600",
  },
}

interface StatusBadgeProps {
  status: RecordStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}
