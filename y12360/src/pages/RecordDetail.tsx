import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Download, ChevronRight } from "lucide-react"
import { usePumpStore } from "@/hooks/usePumpStore"
import StatusBadge from "@/components/StatusBadge"
import ResultCards from "@/components/ResultCards"
import WarningAlert from "@/components/WarningAlert"
import TraceTimeline from "@/components/TraceTimeline"
import type { RecordStatus } from "@shared/types"

const statusFlow: RecordStatus[] = ["draft", "reviewed", "approved", "archived"]
const statusLabel: Record<RecordStatus, string> = {
  draft: "草稿",
  reviewed: "已审核",
  approved: "已批准",
  archived: "已归档",
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRecord: record, loading, fetchRecordById, advanceStatus, exportRecord } = usePumpStore()
  const [operator, setOperator] = useState("engineer")
  const [comment, setComment] = useState("")

  useEffect(() => {
    if (id) fetchRecordById(id)
  }, [id])

  if (loading && !record) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="text-sm text-slate-400">加载中...</span>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-sm text-slate-400">记录不存在</p>
        <button onClick={() => navigate("/records")} className="mt-2 text-sm text-sky-500 hover:underline">
          返回列表
        </button>
      </div>
    )
  }

  const currentIdx = statusFlow.indexOf(record.status)
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null

  function handleAdvance() {
    if (!nextStatus || !id) return
    advanceStatus(id, nextStatus, operator, comment || undefined).then(() => {
      setComment("")
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        onClick={() => navigate("/records")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回记录列表
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">计算详情</h1>
          <StatusBadge status={record.status} />
          <span className="text-xs text-slate-400">v{record.version}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportRecord(record.id, "json")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            JSON
          </button>
          <button
            onClick={() => exportRecord(record.id, "csv")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResultCards record={record} />

          <div className="mt-4">
            <WarningAlert warnings={record.warnings} />
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">输入参数</h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <ParamItem label="额定流量" value={`${record.ratedFlow} ${record.ratedFlowUnit}`} />
              <ParamItem label="额定扬程" value={`${record.ratedHead} ${record.ratedHeadUnit}`} />
              <ParamItem label="额定功率" value={`${record.ratedPower} ${record.ratedPowerUnit}`} />
              <ParamItem label="额定转速" value={`${record.ratedSpeed} rpm`} />
              <ParamItem label="目标转速" value={`${record.targetSpeed} rpm`} />
              <ParamItem label="来源" value={record.source} />
              <ParamItem label="效率估算" value={record.efficiencyEstimate != null ? `${(record.efficiencyEstimate * 100).toFixed(1)}%` : "—"} />
              <ParamItem label="备注" value={record.remark || "—"} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">状态推进</h2>

            <div className="mb-3 flex items-center gap-1">
              {statusFlow.map((s, i) => (
                <div key={s} className="flex items-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      i <= currentIdx
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {statusLabel[s]}
                  </span>
                  {i < statusFlow.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                  )}
                </div>
              ))}
            </div>

            {nextStatus && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">操作人</label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">备注</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <button
                  onClick={handleAdvance}
                  disabled={loading}
                  className="w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  推进为"{statusLabel[nextStatus]}"
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">追溯链路</h2>
            <TraceTimeline history={record.statusHistory} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-mono text-sm text-slate-700">{value}</p>
    </div>
  )
}
