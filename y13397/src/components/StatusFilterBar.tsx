import type { StatusFilter } from "@/types"
import { CheckCircle2, Clock, UserCheck, Filter } from "lucide-react"
import { useStore } from "@/store/useStore"

const filters: { key: StatusFilter; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { key: "all", label: "全部", icon: Filter, color: "text-surface-400" },
  { key: "processed", label: "已处理", icon: CheckCircle2, color: "text-status-processed" },
  { key: "pending_material", label: "待补材料", icon: Clock, color: "text-status-pending" },
  { key: "manual_override", label: "人工改判", icon: UserCheck, color: "text-status-override" },
]

export default function StatusFilterBar() {
  const { statusFilter, setStatusFilter } = useStore()

  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => {
        const Icon = f.icon
        const active = statusFilter === f.key
        return (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              active
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10"
                : "bg-surface-800/50 text-surface-400 border-surface-700/50 hover:border-surface-600 hover:text-surface-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
