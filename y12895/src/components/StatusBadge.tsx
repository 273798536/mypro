import type { ResultStatus } from "@/types"
import { CheckCircle, Clock, RotateCcw } from "lucide-react"

const statusConfig: Record<ResultStatus, { badge: string; icon: typeof CheckCircle; label: string }> = {
  "可用": { badge: "badge-available", icon: CheckCircle, label: "可用" },
  "暂缓": { badge: "badge-deferred", icon: Clock, label: "暂缓" },
  "重新采集": { badge: "badge-recollect", icon: RotateCcw, label: "重新采集" },
}

export default function StatusBadge({ status }: { status: ResultStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={config.badge}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
