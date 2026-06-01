import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Filter, Trash2, Eye, Download, GitCompare } from "lucide-react"
import { usePumpStore } from "@/hooks/usePumpStore"
import StatusBadge from "@/components/StatusBadge"
import type { RecordStatus, RecordFilter } from "@shared/types"

export default function Records() {
  const navigate = useNavigate()
  const { records, loading, compareIds, fetchRecords, deleteRecord, toggleCompareId, clearCompareIds, fetchComparison, exportBatch } = usePumpStore()
  const [filter, setFilter] = useState<RecordFilter>({ page: 1, pageSize: 20 })
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    fetchRecords(filter)
  }, [filter])

  function handleDelete(id: string) {
    if (confirm("确定删除此记录？")) {
      deleteRecord(id).then(() => fetchRecords(filter))
    }
  }

  function handleCompare() {
    const name = `对比-${new Date().toLocaleDateString("zh-CN")}`
    fetchComparison(name)
    navigate("/?compare=true")
  }

  function handleExport(format: "json" | "csv") {
    exportBatch(compareIds, format)
  }

  const data = records?.data || []
  const total = records?.total || 0
  const totalPages = Math.ceil(total / (filter.pageSize || 20))

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">计算记录</h1>
          <p className="mt-1 text-sm text-slate-500">所有相似律计算记录，支持筛选、对比与导出</p>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.length >= 2 && (
            <>
              <button
                onClick={handleCompare}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm text-white hover:bg-sky-600"
              >
                <GitCompare className="h-3.5 w-3.5" />
                对比 ({compareIds.length})
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                导出CSV
              </button>
              <button
                onClick={clearCompareIds}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                清除选择
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索来源或备注..."
            value={filter.keyword || ""}
            onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value || undefined, page: 1 }))}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Filter className="h-3.5 w-3.5" />
          筛选
        </button>
      </div>

      {showFilter && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <select
            value={filter.status || ""}
            onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as RecordStatus | undefined, page: 1 }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="reviewed">已审核</option>
            <option value="approved">已批准</option>
            <option value="archived">已归档</option>
          </select>
          <input
            type="date"
            value={filter.dateFrom || ""}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="开始日期"
          />
          <span className="text-xs text-slate-400">至</span>
          <input
            type="date"
            value={filter.dateTo || ""}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="结束日期"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-500">选择</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">来源</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">额定参数</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">转速变化</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">版本</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">创建时间</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  暂无记录
                </td>
              </tr>
            )}
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(r.id)}
                    onChange={() => toggleCompareId(r.id)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                  />
                </td>
                <td className="px-4 py-3 text-slate-700">{r.source}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {r.ratedFlow}{r.ratedFlowUnit} / {r.ratedHead}{r.ratedHeadUnit} / {r.ratedPower}{r.ratedPowerUnit}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {r.ratedSpeed} → {r.targetSpeed} rpm
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">v{r.version}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/records/${r.id}`)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-sky-500"
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => usePumpStore.getState().exportRecord(r.id, "json")}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-sky-500"
                      title="导出"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            共 {total} 条记录
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
              disabled={(filter.page || 1) <= 1}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-2 text-xs text-slate-500">{filter.page || 1} / {totalPages}</span>
            <button
              onClick={() => setFilter((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))}
              disabled={(filter.page || 1) >= totalPages}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
