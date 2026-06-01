import { useStore, getAnomalyStatsForCategory } from "@/store/useStore"
import { AlertTriangle, Thermometer, FileWarning } from "lucide-react"
import type { AnomalyCategory } from "@/types"

const cards: { category: AnomalyCategory; label: string; icon: React.ReactNode; colorClass: string; ringClass: string }[] = [
  {
    category: "standard_expired",
    label: "标准过期",
    icon: <AlertTriangle size={20} />,
    colorClass: "text-red-400",
    ringClass: "stroke-red-400",
  },
  {
    category: "temp_drift",
    label: "温漂异常",
    icon: <Thermometer size={20} />,
    colorClass: "text-amber-400",
    ringClass: "stroke-amber-400",
  },
  {
    category: "reading_gap",
    label: "读数缺口",
    icon: <FileWarning size={20} />,
    colorClass: "text-slate-400",
    ringClass: "stroke-slate-400",
  },
]

function MiniRing({ percentage, colorClass }: { percentage: number; colorClass: string }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (percentage / 100) * circ

  return (
    <svg width="48" height="48" className="-rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700/60" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={colorClass}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  )
}

export default function AnomalyCards() {
  const getFilteredReviews = useStore((s) => s.getFilteredReviews)
  const reviews = getFilteredReviews()

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ category, label, icon, colorClass, ringClass }) => {
        const { count, percentage, severity } = getAnomalyStatsForCategory(reviews, category)
        const severityLabel = severity === "high" ? "高" : severity === "medium" ? "中" : "低"
        const severityColor = severity === "high" ? "text-red-400" : severity === "medium" ? "text-amber-400" : "text-slate-400"

        return (
          <div
            key={category}
            className="relative flex items-center gap-4 rounded-lg border border-slate-700/50 bg-slate-800/60 px-5 py-4 backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center">
              <MiniRing percentage={percentage} colorClass={ringClass} />
              <span className={`absolute text-xs font-mono font-bold ${colorClass}`}>
                {percentage}%
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={colorClass}>{icon}</span>
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  <span className="text-lg font-mono font-bold text-slate-100">{count}</span>{" "}
                  条记录
                </span>
                <span className={`font-medium ${severityColor}`}>
                  严重度: {severityLabel}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
