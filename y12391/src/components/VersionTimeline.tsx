import { useState, useRef, useEffect } from "react"
import { useEnvelopeStore } from "@/store"
import type { VersionSnapshot } from "@/types"

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function TooltipContent({ v, anomalyCount, questionCount }: { v: VersionSnapshot; anomalyCount: number; questionCount: number }) {
  return (
    <div className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-xs space-y-1 min-w-[160px] shadow-xl">
      <div className="text-neutral-300 font-medium">{v.label}</div>
      <div className="text-neutral-500">{formatTime(v.createdAt)}</div>
      <div className="text-neutral-400 border-t border-neutral-700 pt-1 mt-1 space-y-0.5">
        <div>A: {v.envelope.attack.toFixed(3)}s</div>
        <div>D: {v.envelope.decay.toFixed(3)}s</div>
        <div>S: {v.envelope.sustain.toFixed(2)}</div>
        <div>R: {v.envelope.release.toFixed(3)}s</div>
      </div>
      <div className="flex gap-3 border-t border-neutral-700 pt-1 mt-1">
        {anomalyCount > 0 && <span className="text-amber-400">异常: {anomalyCount}</span>}
        {questionCount > 0 && <span className="text-blue-400">问题: {questionCount}</span>}
        {anomalyCount === 0 && questionCount === 0 && <span className="text-green-400">无异常</span>}
      </div>
    </div>
  )
}

export default function VersionTimeline() {
  const { versions, currentVersionId, setCurrentVersion, anomalies, questions } = useEnvelopeStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [newId, setNewId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(versions.length)

  useEffect(() => {
    if (versions.length > prevCountRef.current) {
      const latest = versions[versions.length - 1]
      setNewId(latest.id)
      setTimeout(() => setNewId(null), 600)
      scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" })
    }
    prevCountRef.current = versions.length
  }, [versions.length])

  const anomalyCount = (id: string) => anomalies.filter((a) => a.versionId === id).length
  const questionCount = (id: string) => questions.filter((q) => q.affectedVersionIds.includes(id)).length

  if (versions.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-xl px-6 py-4 text-neutral-500 text-sm text-center">
        暂无版本快照
      </div>
    )
  }

  return (
    <div className="bg-neutral-900 rounded-xl px-4 py-5">
      <div ref={scrollRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-700">
        <div className="flex items-center gap-0 min-w-max px-4 py-6">
          {versions.map((v, i) => {
            const isCurrent = v.id === currentVersionId
            const ac = anomalyCount(v.id)
            const qc = questionCount(v.id)
            const isNew = v.id === newId
            return (
              <div key={v.id} className="flex items-center relative">
                {i > 0 && (
                  <div className="h-[2px] w-12 bg-[#333] -translate-y-[2px]" />
                )}
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onMouseEnter={() => setHoveredId(v.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setCurrentVersion(v.id)}
                >
                  <div
                    className={`
                      rounded-full flex items-center justify-center transition-all duration-300
                      ${isCurrent ? "w-[18px] h-[18px]" : "w-[12px] h-[12px]"}
                      ${isCurrent ? "bg-[#00ff88] shadow-[0_0_12px_2px_rgba(0,255,136,0.5)]" : "bg-neutral-500 hover:bg-neutral-400"}
                      ${isNew ? "animate-ping-once" : ""}
                    `}
                  >
                    {(ac > 0 || qc > 0) && !isCurrent && (
                      <div className="absolute -top-1 -right-1 flex gap-[2px]">
                        {ac > 0 && <div className="w-[6px] h-[6px] rounded-full bg-amber-400" />}
                        {qc > 0 && <div className="w-[6px] h-[6px] rounded-full bg-blue-400" />}
                      </div>
                    )}
                    {(ac > 0 || qc > 0) && isCurrent && (
                      <div className="absolute -top-1.5 -right-1.5 flex gap-[2px]">
                        {ac > 0 && <div className="w-[7px] h-[7px] rounded-full bg-amber-400" />}
                        {qc > 0 && <div className="w-[7px] h-[7px] rounded-full bg-blue-400" />}
                      </div>
                    )}
                  </div>
                  <div className={`mt-2 text-[10px] whitespace-nowrap ${isCurrent ? "text-[#00ff88] font-medium" : "text-neutral-400"}`}>
                    {v.label}
                  </div>
                  <div className="text-[9px] text-neutral-600 whitespace-nowrap">
                    {formatTime(v.createdAt)}
                  </div>
                  {hoveredId === v.id && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50">
                      <TooltipContent v={v} anomalyCount={ac} questionCount={qc} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
