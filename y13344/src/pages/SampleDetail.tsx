import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, AlertCircle } from "lucide-react"
import type { EvaluationResult, HumanCorrection } from "@/types"
import { fetchEvaluationDetail, fetchSampleChain, fetchCorrections } from "@/utils/api"
import Timeline from "@/components/Timeline"
import CorrectionCard from "@/components/CorrectionCard"
import DriftBadge from "@/components/DriftBadge"

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [chain, setChain] = useState<EvaluationResult[]>([])
  const [current, setCurrent] = useState<EvaluationResult | null>(null)
  const [corrections, setCorrections] = useState<HumanCorrection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawOpen, setRawOpen] = useState(false)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const chainData = await fetchSampleChain(id)
        if (cancelled) return

        const sorted = [...chainData].sort(
          (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
        )
        setChain(sorted)

        const latest = sorted[0] ?? null
        setCurrent(latest)

        if (latest?.hasHumanCorrection) {
          const corrs = await fetchCorrections(latest.id)
          if (!cancelled) setCorrections(corrs)
        } else {
          setCorrections([])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  async function handleSelectEvaluation(evalId: string) {
    if (!evalId || evalId === current?.id) return
    try {
      const detail = await fetchEvaluationDetail(evalId)
      setCurrent(detail)

      if (detail.hasHumanCorrection) {
        const corrs = await fetchCorrections(detail.id)
        setCorrections(corrs)
      } else {
        setCorrections([])
      }
    } catch {
      // keep current data
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-slate-400">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="text-cyan-400 text-sm hover:underline"
        >
          返回首页
        </button>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-semibold">
            样本{" "}
            <span className="font-mono text-cyan-400">{current.sampleId}</span>
          </h1>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
            {current.version}
          </span>
        </div>
      </div>

      <div className="flex gap-0">
        <div className="w-[30%] min-w-[260px] border-r border-slate-800 p-4 overflow-y-auto max-h-[calc(100vh-65px)]">
          <h2 className="text-sm font-medium text-slate-400 mb-4">评估历史</h2>
          <Timeline
            evaluations={chain}
            currentId={current.id}
            onSelect={handleSelectEvaluation}
          />
        </div>

        <div className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          <div className="grid grid-cols-2 gap-4 mb-8">
            {current.metrics.map((metric) => (
              <div
                key={metric.id}
                className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{metric.name}</span>
                  <DriftBadge metric={metric} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono text-slate-100">
                    {metric.value}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    阈值 {metric.threshold}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {current.hasHumanCorrection && corrections.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-slate-400 mb-3">
                人工修正
              </h2>
              <div className="flex flex-col gap-3">
                {corrections.map((c) => (
                  <CorrectionCard key={c.id} correction={c} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={() => setRawOpen((v) => !v)}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {rawOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              查看接口返回
            </button>

            {rawOpen && (
              <pre className="mt-3 bg-slate-950 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800 max-h-[400px] overflow-y-auto">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(current.rawApiResponse), null, 2)
                  } catch {
                    return current.rawApiResponse
                  }
                })()}
              </pre>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>数据来源:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {current.source}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
