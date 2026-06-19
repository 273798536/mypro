import { ArrowRight } from "lucide-react"
import type { HumanCorrection } from "@/types"

interface CorrectionCardProps {
  correction: HumanCorrection
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function CorrectionCard({ correction }: CorrectionCardProps) {
  return (
    <div className="bg-slate-800/60 border-l-4 border-amber-500 rounded-r-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-slate-300 font-medium">
          {correction.metricName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-lg font-mono font-semibold text-amber-400">
          {correction.originalValue}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-500" />
        <span className="text-lg font-mono font-semibold text-emerald-400">
          {correction.correctedValue}
        </span>
      </div>

      {correction.reason && (
        <p className="text-xs text-slate-400 mt-2">{correction.reason}</p>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
        <span>{correction.correctedBy}</span>
        <span className="font-mono">{formatTime(correction.correctedAt)}</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">
          {correction.source}
        </span>
      </div>
    </div>
  )
}
