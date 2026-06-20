import { useMemo } from "react"
import { useQueueStore } from "@/store/queueStore"
import { AlertTriangle, CheckCircle2, Clock, Layers, ShieldAlert } from "lucide-react"

const cards = [
  { key: "total" as const, label: "总任务", icon: Layers, color: "text-zinc-300", bg: "bg-zinc-800", border: "border-zinc-700" },
  { key: "failure" as const, label: "失败", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-800/50" },
  { key: "normal" as const, label: "正常", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/50" },
  { key: "pending" as const, label: "待复核", icon: Clock, color: "text-sky-400", bg: "bg-sky-950/40", border: "border-sky-800/50" },
  { key: "confirmed" as const, label: "已处理", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/50" },
  { key: "contaminated" as const, label: "污染标记", icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-800/50" },
]

export function SummaryCards() {
  const records = useQueueStore(s => s.records)

  const stats = useMemo(() => ({
    total: records.length,
    failure: records.filter(r => r.type === "failure").length,
    normal: records.filter(r => r.type === "normal").length,
    confirmed: records.filter(r => r.status === "confirmed").length,
    pending: records.filter(r => r.status === "pending").length,
    contaminated: records.filter(r => r.isContaminated).length,
  }), [records])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => {
        const Icon = c.icon
        const value = stats[c.key]
        return (
          <div
            key={c.key}
            className={`${c.bg} ${c.border} border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-zinc-400 font-medium">{c.label}</span>
            </div>
            <span className={`text-2xl font-bold ${c.color} tabular-nums`}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}
