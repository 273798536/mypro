import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { EvaluationResult } from "@/types"

interface SampleTableProps {
  items: EvaluationResult[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

function getMetric(result: EvaluationResult, name: string) {
  return result.metrics.find((m) => m.name === name)
}

function MetricCell({ metric }: { metric: { value: number; isDrifted: boolean } | undefined }) {
  if (!metric) return <span className="text-slate-500">—</span>
  return (
    <span className={`font-mono ${metric.isDrifted ? "text-rose-400" : "text-slate-200"}`}>
      {metric.value.toFixed(2)}
    </span>
  )
}

function StatusBadges({ item }: { item: EvaluationResult }) {
  if (item.hasHumanCorrection && item.hasThresholdDrift) {
    return (
      <div className="flex gap-1">
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">已修正</span>
        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-400">漂移</span>
      </div>
    )
  }
  if (item.hasHumanCorrection) {
    return <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">已修正</span>
  }
  if (item.hasThresholdDrift) {
    return <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-400">漂移</span>
  }
  return <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">正常</span>
}

function RowBorder({ item }: { item: EvaluationResult }) {
  if (item.hasHumanCorrection && item.hasThresholdDrift) {
    return (
      <td
        className="border-l-4"
        style={{
          borderImage: "linear-gradient(to bottom, #f59e0b, #f43f5e) 1",
        }}
      />
    )
  }
  if (item.hasHumanCorrection) {
    return <td className="border-l-4 border-amber-500" />
  }
  if (item.hasThresholdDrift) {
    return <td className="border-l-4 border-rose-500" />
  }
  return <td className="border-l-4 border-transparent" />
}

export default function SampleTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
}: SampleTableProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-xs text-slate-400">
            <th className="w-1" />
            <th className="px-4 py-3">样本ID</th>
            <th className="px-4 py-3">版本</th>
            <th className="px-4 py-3">评测时间</th>
            <th className="px-4 py-3">准确率</th>
            <th className="px-4 py-3">召回率</th>
            <th className="px-4 py-3">F1分数</th>
            <th className="px-4 py-3">响应时间</th>
            <th className="px-4 py-3">状态</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => navigate(`/sample/${item.sampleId}`)}
              className="cursor-pointer border-b border-slate-700/30 transition-colors hover:bg-slate-800/50"
            >
              <RowBorder item={item} />
              <td className="px-4 py-3 font-mono text-slate-300">{item.sampleId}</td>
              <td className="px-4 py-3 text-slate-300">{item.version}</td>
              <td className="px-4 py-3 text-slate-400">{item.evaluatedAt}</td>
              <td className="px-4 py-3">
                <MetricCell metric={getMetric(item, "准确率")} />
              </td>
              <td className="px-4 py-3">
                <MetricCell metric={getMetric(item, "召回率")} />
              </td>
              <td className="px-4 py-3">
                <MetricCell metric={getMetric(item, "F1分数")} />
              </td>
              <td className="px-4 py-3">
                <MetricCell metric={getMetric(item, "响应时间")} />
              </td>
              <td className="px-4 py-3">
                <StatusBadges item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700/50 px-4 py-3">
          <span className="text-xs text-slate-400">
            共 {total} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg bg-slate-700/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-600/50 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                typeof p === "string" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                      p === page
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg bg-slate-700/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-600/50 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
