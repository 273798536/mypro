import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useEnvelopeStore } from "@/store"
import type { EnvelopeParams } from "@/types"
import { PARAM_LIMITS } from "@/types"
import { ArrowRight, BookOpen } from "lucide-react"

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const PARAM_LABELS: Record<keyof EnvelopeParams, string> = {
  attack: "Attack",
  decay: "Decay",
  sustain: "Sustain",
  release: "Release",
}

const PARAM_UNITS: Record<keyof EnvelopeParams, string> = {
  attack: "s",
  decay: "s",
  sustain: "",
  release: "s",
}

function CompareCanvas({ dataA, dataB, sampleRate, width = 800, height = 200 }: {
  dataA: number[]; dataB: number[]; sampleRate: number; width?: number; height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(width)

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setCw(Math.floor(e.contentRect.width))
    })
    obs.observe(c)
    return () => obs.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const midY = h / 2
    const pad = 30

    ctx.fillStyle = "#0a0a0f"
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = "#1a1a2e"
    ctx.lineWidth = 0.5
    for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

    const maxLen = Math.max(dataA.length, dataB.length)
    if (maxLen === 0) return
    const step = Math.max(1, Math.floor(maxLen / (w - pad * 2)))

    const ampToY = (a: number) => midY - a * (midY - pad)
    const idxToX = (i: number) => pad + (i / maxLen) * (w - pad * 2)

    const drawWave = (data: number[], color: string, alpha: number) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < data.length; i += step) {
        const x = idxToX(i)
        const y = ampToY(data[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
    }

    drawWave(dataA, "#00ff88", 0.8)
    drawWave(dataB, "#4488ff", 0.8)

    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = "#ff8800"
    ctx.beginPath()
    const minLen = Math.min(dataA.length, dataB.length)
    for (let i = 0; i < minLen; i += step) {
      const x = idxToX(i)
      const diff = Math.abs(dataA[i] - dataB[i])
      const yTop = ampToY(Math.max(dataA[i], dataB[i]))
      const yBot = ampToY(Math.min(dataA[i], dataB[i]))
      if (diff > 0.01) {
        ctx.fillRect(x, yTop, 2, yBot - yTop)
      }
    }
    ctx.restore()

    ctx.fillStyle = "#888888"
    ctx.font = "10px monospace"
    ctx.textAlign = "center"
    for (let i = 0; i <= 6; i++) {
      const sampleIdx = (maxLen * i) / 6
      const t = sampleIdx / sampleRate
      ctx.fillText(`${t.toFixed(2)}s`, pad + ((w - pad * 2) * i) / 6, h - 4)
    }
  }, [dataA, dataB, sampleRate, cw, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = cw
    canvas.height = height
    draw()
  }, [draw, cw, height])

  return (
    <div ref={containerRef} className="relative w-full rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="block w-full" style={{ height }} />
    </div>
  )
}

export default function Compare() {
  const versions = useEnvelopeStore((s) => s.versions)
  const samples = useEnvelopeStore((s) => s.samples)
  const questions = useEnvelopeStore((s) => s.questions)
  const anomalies = useEnvelopeStore((s) => s.anomalies)
  const applyEnvelopeToSample = useEnvelopeStore((s) => s.applyEnvelopeToSample)

  const [idA, setIdA] = useState<string>("")
  const [idB, setIdB] = useState<string>("")

  const verA = useMemo(() => versions.find((v) => v.id === idA), [versions, idA])
  const verB = useMemo(() => versions.find((v) => v.id === idB), [versions, idB])

  const sampleA = useMemo(() => samples.find((s) => s.id === verA?.sampleId), [samples, verA])
  const sampleB = useMemo(() => samples.find((s) => s.id === verB?.sampleId), [samples, verB])

  const dataA = useMemo(() => {
    if (!verA || !sampleA) return []
    return applyEnvelopeToSample(sampleA.id, verA.envelope)
  }, [verA, sampleA, applyEnvelopeToSample])

  const dataB = useMemo(() => {
    if (!verB || !sampleB) return []
    return applyEnvelopeToSample(sampleB.id, verB.envelope)
  }, [verB, sampleB, applyEnvelopeToSample])

  const paramKeys = Object.keys(PARAM_LIMITS) as (keyof EnvelopeParams)[]

  const questionsA = useMemo(() => questions.filter((q) => q.affectedVersionIds.includes(idA)), [questions, idA])
  const questionsB = useMemo(() => questions.filter((q) => q.affectedVersionIds.includes(idB)), [questions, idB])

  const anomaliesA = useMemo(() => anomalies.filter((a) => a.versionId === idA), [anomalies, idA])
  const anomaliesB = useMemo(() => anomalies.filter((a) => a.versionId === idB), [anomalies, idB])

  if (versions.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-sm">
        至少需要两个版本才能进行对比
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-lg font-bold text-white/90">版本对比</h1>

          <div className="flex items-center gap-4">
            <select
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              className="flex-1 bg-[#1a1a2e] text-[#00ff88] text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-[#00ff88] focus:outline-none"
            >
              <option value="">选择版本 A</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.label} — {formatTime(v.createdAt)}</option>
              ))}
            </select>

            <ArrowRight size={20} className="text-white/20 shrink-0" />

            <select
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              className="flex-1 bg-[#1a1a2e] text-[#4488ff] text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-[#4488ff] focus:outline-none"
            >
              <option value="">选择版本 B</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.label} — {formatTime(v.createdAt)}</option>
              ))}
            </select>
          </div>

          {verA && verB && (
            <>
              <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-4 space-y-3">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">波形叠加对比</h3>
                <CompareCanvas
                  dataA={dataA}
                  dataB={dataB}
                  sampleRate={sampleA?.sampleRate || 44100}
                  height={200}
                />
                <div className="flex items-center gap-4 text-[10px] text-white/30">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-[2px] bg-[#00ff88] inline-block" />
                    {verA.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-[2px] bg-[#4488ff] inline-block" />
                    {verB.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#ff8800]/30 inline-block" />
                    差异区域
                  </span>
                </div>
              </div>

              <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-4">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">参数差异</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-white/30 border-b border-white/5">
                      <th className="text-left py-2 font-normal">参数</th>
                      <th className="text-right py-2 font-normal text-[#00ff88]">{verA.label}</th>
                      <th className="text-right py-2 font-normal text-[#4488ff]">{verB.label}</th>
                      <th className="text-right py-2 font-normal">变化量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramKeys.map((key) => {
                      const valA = verA.envelope[key]
                      const valB = verB.envelope[key]
                      const diff = valB - valA
                      const unit = PARAM_UNITS[key]
                      const changed = Math.abs(diff) > 0.0001

                      return (
                        <tr key={key} className={`border-b border-white/[0.03] ${changed ? "bg-[#ff880008]" : ""}`}>
                          <td className={`py-2 ${changed ? "text-[#ff8800]" : "text-white/50"}`}>
                            {PARAM_LABELS[key]}
                          </td>
                          <td className="text-right py-2 font-mono text-[#00ff88]/70">
                            {valA.toFixed(3)}{unit}
                          </td>
                          <td className="text-right py-2 font-mono text-[#4488ff]/70">
                            {valB.toFixed(3)}{unit}
                          </td>
                          <td className="text-right py-2 font-mono">
                            {changed ? (
                              <span className="text-[#ff8800]">
                                {diff > 0 ? "+" : ""}{diff.toFixed(3)}{unit}
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {(questionsA.length > 0 || questionsB.length > 0) && (
                <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-4">
                  <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen size={12} />
                    课堂题目影响标注
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#00ff88]/70 mb-2 block">{verA.label} 关联题目</span>
                      {questionsA.length === 0 ? (
                        <span className="text-xs text-white/20">无关联题目</span>
                      ) : (
                        questionsA.map((q) => (
                          <div key={q.id} className="p-2 bg-[#1a1a2e] rounded border border-white/5 text-xs text-white/60 mb-1">
                            <p>{q.content}</p>
                            {q.affectedParamKeys.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {q.affectedParamKeys.map((k) => (
                                  <span key={k} className="px-1 py-0.5 rounded bg-[#00ff8815] text-[#00ff88]/70 text-[10px]">
                                    {PARAM_LABELS[k]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-[#4488ff]/70 mb-2 block">{verB.label} 关联题目</span>
                      {questionsB.length === 0 ? (
                        <span className="text-xs text-white/20">无关联题目</span>
                      ) : (
                        questionsB.map((q) => (
                          <div key={q.id} className="p-2 bg-[#1a1a2e] rounded border border-white/5 text-xs text-white/60 mb-1">
                            <p>{q.content}</p>
                            {q.affectedParamKeys.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {q.affectedParamKeys.map((k) => (
                                  <span key={k} className="px-1 py-0.5 rounded bg-[#4488ff15] text-[#4488ff]/70 text-[10px]">
                                    {PARAM_LABELS[k]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {(anomaliesA.length > 0 || anomaliesB.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <span className="text-xs text-white/30 mb-2 block">异常关联</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {anomaliesA.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-[#ff8800]/70 mb-1">
                              <span className={`w-2 h-2 rounded-full ${a.status === "confirmed" ? "bg-[#00ff88]" : "bg-[#ff8800]"}`} />
                              {a.description.slice(0, 30)}…
                            </div>
                          ))}
                        </div>
                        <div>
                          {anomaliesB.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-[#ff8800]/70 mb-1">
                              <span className={`w-2 h-2 rounded-full ${a.status === "confirmed" ? "bg-[#00ff88]" : "bg-[#ff8800]"}`} />
                              {a.description.slice(0, 30)}…
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
