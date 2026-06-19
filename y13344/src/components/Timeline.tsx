import { useState, useEffect } from "react"
import type { EvaluationResult } from "@/types"

interface TimelineProps {
  evaluations: EvaluationResult[]
  currentId: string
  onSelect: (id: string) => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function Timeline({ evaluations, currentId, onSelect }: TimelineProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    let count = 0
    const timer = setInterval(() => {
      count++
      setVisibleCount(count)
      if (count >= evaluations.length) clearInterval(timer)
    }, 80)
    return () => clearInterval(timer)
  }, [evaluations.length])

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-700" />

      <div className="flex flex-col gap-4">
        {evaluations.map((ev, i) => {
          const isCurrent = ev.id === currentId
          const isVisible = i < visibleCount

          return (
            <button
              key={ev.id}
              onClick={() => onSelect(ev.id)}
              className={`relative text-left transition-all duration-300 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
              }`}
            >
              <div
                className={`absolute left-[-18px] top-2 w-3 h-3 rounded-full border-2 ${
                  isCurrent
                    ? "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    : "bg-slate-800 border-slate-600"
                }`}
              />

              <div
                className={`rounded-lg p-3 transition-colors ${
                  isCurrent
                    ? "bg-slate-800 border border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                    : "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isCurrent
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {ev.version}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {formatTime(ev.evaluatedAt)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {ev.metrics.slice(0, 3).map((m) => (
                    <span key={m.id} className="text-xs text-slate-400 font-mono">
                      {m.name}: <span className="text-slate-300">{m.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
