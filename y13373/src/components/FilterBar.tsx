import { useState, useMemo } from "react"
import { useQueueStore } from "@/store/queueStore"
import { Search, Filter, Download, Upload, RotateCcw, CheckCircle2, ShieldAlert, X } from "lucide-react"
import type { FilterType, FilterStatus, FilterContamination } from "@/types"
import { exportToCSV, exportToJSON } from "@/utils/export"

const typeOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "全部类型" },
  { value: "failure", label: "失败" },
  { value: "normal", label: "正常" },
]

const statusOptions: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待复核" },
  { value: "confirmed", label: "已处理" },
  { value: "withdrawn", label: "已撤回" },
]

const contaminationOptions: { value: FilterContamination; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "contaminated", label: "已污染" },
  { value: "clean", label: "未污染" },
]

export function FilterBar() {
  const records = useQueueStore(s => s.records)
  const filterType = useQueueStore(s => s.filterType)
  const filterStatus = useQueueStore(s => s.filterStatus)
  const filterContamination = useQueueStore(s => s.filterContamination)
  const searchQuery = useQueueStore(s => s.searchQuery)
  const setFilterType = useQueueStore(s => s.setFilterType)
  const setFilterStatus = useQueueStore(s => s.setFilterStatus)
  const setFilterContamination = useQueueStore(s => s.setFilterContamination)
  const setSearchQuery = useQueueStore(s => s.setSearchQuery)
  const setImportModalOpen = useQueueStore(s => s.setImportModalOpen)
  const resetToSeed = useQueueStore(s => s.resetToSeed)

  const [exportOpen, setExportOpen] = useState(false)

  const hasFilter = filterType !== "all" || filterStatus !== "all" || filterContamination !== "all" || searchQuery !== ""

  const filteredForExport = useMemo(() => {
    return records.filter(r => {
      if (filterType !== "all" && r.type !== filterType) return false
      if (filterStatus !== "all" && r.status !== filterStatus) return false
      if (filterContamination === "contaminated" && !r.isContaminated) return false
      if (filterContamination === "clean" && r.isContaminated) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable = `${r.taskId} ${r.taskName} ${r.model} ${r.dataset} ${r.failureLog}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [records, filterType, filterStatus, filterContamination, searchQuery])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="搜索任务ID、名称、模型、数据集..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterContamination}
            onChange={e => setFilterContamination(e.target.value as FilterContamination)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {contaminationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {hasFilter && (
          <button
            onClick={() => {
              setFilterType("all")
              setFilterStatus("all")
              setFilterContamination("all")
              setSearchQuery("")
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置筛选
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          导入
        </button>

        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                <button
                  onClick={() => { exportToCSV(filteredForExport); setExportOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  导出 CSV
                </button>
                <button
                  onClick={() => { exportToJSON(filteredForExport); setExportOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  导出 JSON
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={resetToSeed}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors ml-auto"
          title="重置为初始演示数据"
        >
          <RotateCcw className="w-4 h-4" />
          重置数据
        </button>
      </div>
    </div>
  )
}

export function BatchActionBar() {
  const selectedIds = useQueueStore(s => s.selectedIds)
  const clearSelection = useQueueStore(s => s.clearSelection)
  const batchConfirm = useQueueStore(s => s.batchConfirm)
  const batchWithdraw = useQueueStore(s => s.batchWithdraw)
  const batchToggleContamination = useQueueStore(s => s.batchToggleContamination)

  if (selectedIds.length === 0) return null

  return (
    <div className="bg-zinc-800/90 backdrop-blur-sm border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-sm text-zinc-300">已选 <strong className="text-emerald-400">{selectedIds.length}</strong> 条</span>
      <div className="w-px h-5 bg-zinc-700" />
      <button
        onClick={() => batchConfirm(selectedIds)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-800/50 transition-colors"
      >
        <CheckCircle2 className="w-4 h-4" />
        批量确认
      </button>
      <button
        onClick={() => batchWithdraw(selectedIds)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-950/40 text-amber-400 hover:bg-amber-900/40 border border-amber-800/50 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        批量撤回
      </button>
      <button
        onClick={() => batchToggleContamination(selectedIds)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-800/50 transition-colors"
      >
        <ShieldAlert className="w-4 h-4" />
        切换污染标记
      </button>
      <button
        onClick={clearSelection}
        className="ml-auto text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        取消选择
      </button>
    </div>
  )
}
