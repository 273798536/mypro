import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: number | string
  icon: ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?: string
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = "cyan",
}: StatCardProps) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/20 text-cyan-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/20 text-amber-400",
    rose: "bg-rose-500/20 text-rose-400",
    orange: "bg-orange-500/20 text-orange-400",
  }

  const trendIcon =
    trend === "up" ? (
      <TrendingUp size={14} className="text-emerald-400" />
    ) : trend === "down" ? (
      <TrendingDown size={14} className="text-rose-400" />
    ) : trend === "neutral" ? (
      <Minus size={14} className="text-slate-400" />
    ) : null

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            colorMap[color] ?? colorMap.cyan
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-400">{title}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{value}</p>
      {(trend || trendValue) && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trendIcon}
          {trendValue && (
            <span
              className={
                trend === "up"
                  ? "text-emerald-400"
                  : trend === "down"
                    ? "text-rose-400"
                    : "text-slate-400"
              }
            >
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
