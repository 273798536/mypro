import type { ReplayRecord } from "@/types"
import { CheckCircle2, Clock, UserCheck } from "lucide-react"

const statusConfig: Record<ReplayRecord["status"], { label: string; color: string; icon: typeof CheckCircle2 }> = {
  processed: { label: "已处理", color: "text-status-processed bg-status-processed/15 border-status-processed/20", icon: CheckCircle2 },
  pending_material: { label: "待补材料", color: "text-status-pending bg-status-pending/15 border-status-pending/20", icon: Clock },
  manual_override: { label: "人工改判", color: "text-status-override bg-status-override/15 border-status-override/20", icon: UserCheck },
}

const recordTypeLabels: Record<ReplayRecord["recordType"], string> = {
  normal: "顺利记录",
  supplementary: "补录记录",
  anomaly: "异常记录",
}

export { statusConfig, recordTypeLabels }
