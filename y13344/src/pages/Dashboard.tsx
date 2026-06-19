import { useEffect, useState, useCallback } from "react"
import { Database, CheckCircle, PenLine, AlertTriangle, BarChart3, Download, RefreshCw } from "lucide-react"
import { useStore } from "@/store"
import { fetchEvaluations, triggerRerun, exportData } from "@/utils/api"
import type { EvaluationListResponse } from "@/types"
import FilterBar from "@/components/FilterBar"
import StatCard from "@/components/StatCard"
import SampleTable from "@/components/SampleTable"

export default function Dashboard() {
  const { filter, setFilter } = useStore()
  const [data, setData] = useState<EvaluationListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchEvaluations(filter)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRerun = async () => {
    setRerunning(true)
    try {
      await triggerRerun({
        version: filter.version ?? "",
      })
      await loadData()
    } catch {
    } finally {
      setRerunning(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await exportData({
        filter,
        format: "csv",
        includeRawResponse: false,
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "evaluations.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
    }
  }

  const stats = data?.statistics

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-rose-400">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">评测仪表盘</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600/50 hover:text-slate-100"
          >
            <Download size={16} />
            导出
          </button>
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="flex items-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/30 disabled:opacity-50"
          >
            <RefreshCw size={16} className={rerunning ? "animate-spin" : ""} />
            重跑
          </button>
        </div>
      </div>

      <FilterBar />

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800/60" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            title="总样本数"
            value={stats.totalSamples}
            icon={<Database size={18} />}
            color="cyan"
          />
          <StatCard
            title="已评测数"
            value={stats.evaluatedCount}
            icon={<CheckCircle size={18} />}
            color="emerald"
          />
          <StatCard
            title="人工修正数"
            value={stats.humanCorrectionCount}
            icon={<PenLine size={18} />}
            color="amber"
          />
          <StatCard
            title="阈值漂移数"
            value={stats.thresholdDriftCount}
            icon={<AlertTriangle size={18} />}
            color="rose"
          />
          <StatCard
            title="指标均值概要"
            value={
              stats.metricSummaries.length > 0
                ? stats.metricSummaries
                    .map((m) => `${m.name}: ${m.mean.toFixed(2)}`)
                    .join("  ")
                : "—"
            }
            icon={<BarChart3 size={18} />}
            color="orange"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-slate-800/40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-800/30" />
          ))}
        </div>
      ) : data ? (
        <SampleTable
          items={data.items}
          total={data.total}
          page={filter.page ?? 1}
          pageSize={filter.pageSize ?? 20}
          onPageChange={(p) => setFilter({ page: p })}
        />
      ) : null}
    </div>
  )
}
