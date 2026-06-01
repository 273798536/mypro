import { useEffect, useState } from "react"
import { Download, FileJson, FileSpreadsheet, Check } from "lucide-react"
import { usePumpStore } from "@/hooks/usePumpStore"
import StatusBadge from "@/components/StatusBadge"
import type { RecordStatus } from "@shared/types"

export default function Export() {
  const { records, loading, fetchRecords, exportBatch } = usePumpStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [format, setFormat] = useState<"json" | "csv">("csv")
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "">("")
  const [exported, setExported] = useState(false)

  useEffect(() => {
    fetchRecords({ pageSize: 100, status: statusFilter || undefined })
  }, [statusFilter])

  const data = records?.data || []

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setExported(false)
  }

  function toggleAll() {
    if (selectedIds.length === data.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.map((r) => r.id))
    }
    setExported(false)
  }

  async function handleExport() {
    if (selectedIds.length === 0) return
    await exportBatch(selectedIds, format)
    setExported(true)
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">报告导出</h1>
        <p className="mt-1 text-sm text-slate-500">选择记录并导出为 JSON 或 CSV 格式，含来源与版本信息</p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RecordStatus | "")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="reviewed">已审核</option>
          <option value="approved">已批准</option>
          <option value="archived">已归档</option>
        </select>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => { setFormat("csv"); setExported(false) }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              format === "csv" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => { setFormat("json"); setExported(false) }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              format === "json" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileJson className="h-3.5 w-3.5" />
            JSON
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.length === data.length && data.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
            />
            <span className="text-sm text-slate-600">
              已选 {selectedIds.length} / {data.length} 条
            </span>
          </div>
          <button
            onClick={handleExport}
            disabled={selectedIds.length === 0 || loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {exported ? (
              <>
                <Check className="h-4 w-4" />
                已导出
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                导出 {format.toUpperCase()}
              </>
            )}
          </button>
        </div>

        <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {data.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(r.id)}
                onChange={() => toggleId(r.id)}
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{r.source}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-slate-400">v{r.version}</span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {r.ratedFlow}{r.ratedFlowUnit} / {r.ratedHead}{r.ratedHeadUnit} / {r.ratedPower}{r.ratedPowerUnit} | {r.ratedSpeed}→{r.targetSpeed} rpm
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(r.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </label>
          ))}
          {data.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              暂无记录
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">使用说明</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          <li>• 选择需要导出的记录，支持全选或单条勾选</li>
          <li>• CSV 格式适合在 Excel 中查看，JSON 格式保留完整结构信息</li>
          <li>• 导出内容包含来源、版本、校验警告和状态流转记录</li>
          <li>• 单位混用记录在导出中会标注警告信息</li>
        </ul>
      </div>
    </div>
  )
}
