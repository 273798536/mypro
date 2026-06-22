import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Database, AlertTriangle, Clock, PenLine, RotateCcw, Info, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useReviewStore } from "@/store/useReviewStore"
import type { BoundaryType, ReviewStatus } from "@/types"
import { clsx } from "clsx"
import Papa from "papaparse"

const boundaryLabels: Record<BoundaryType, string> = {
  normal: "正常",
  empty_set: "空集合",
  zero_value: "零值",
  extrapolation_overflow: "外推溢出",
}

const boundaryColors: Record<BoundaryType, string> = {
  normal: "bg-emerald-500/15 text-emerald-400",
  empty_set: "bg-red-500/15 text-red-400",
  zero_value: "bg-amber-500/15 text-amber-400",
  extrapolation_overflow: "bg-orange-500/15 text-orange-400",
}

const statusLabels: Record<ReviewStatus, string> = {
  pending: "待复核",
  confirmed: "已确认",
  overridden: "已改判",
}

const statusColors: Record<ReviewStatus, string> = {
  pending: "bg-gray-500/15 text-gray-400",
  confirmed: "bg-emerald-500/15 text-emerald-400",
  overridden: "bg-amber-500/15 text-amber-400",
}

const selectCls =
  "bg-[#0f1219] border border-[#1e2440] text-sm text-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-amber-500/50"

function ValueCell({ value, unit }: { value: number | null; unit?: string }) {
  if (value === null)
    return <span className="text-red-400 font-medium">∅</span>
  if (value === 0)
    return <span className="text-amber-400">0{unit ? ` ${unit}` : ""}</span>
  return <span>{value}{unit ? ` ${unit}` : ""}</span>
}

export default function Dashboard() {
  const filter = useReviewStore((s) => s.filter)
  const setFilter = useReviewStore((s) => s.setFilter)
  const resetFilter = useReviewStore((s) => s.resetFilter)
  const selectedSampleIds = useReviewStore((s) => s.selectedSampleIds)
  const toggleSampleSelection = useReviewStore((s) => s.toggleSampleSelection)
  const selectAllFiltered = useReviewStore((s) => s.selectAllFiltered)
  const clearSelection = useReviewStore((s) => s.clearSelection)
  const confirmSamples = useReviewStore((s) => s.confirmSamples)
  const filteredSamples = useReviewStore((s) => s.filteredSamples)
  const computedStats = useReviewStore((s) => s.computedStats)
  const getBatchIds = useReviewStore((s) => s.getBatchIds)
  const getParameterNames = useReviewStore((s) => s.getParameterNames)

  const stats = computedStats()
  const samples = filteredSamples()
  const batchIds = getBatchIds()
  const paramNames = getParameterNames()
  const [page, setPage] = useState(0)
  const [exportState, setExportState] = useState<"idle" | "loading" | "done">("idle")
  const pageSize = 8
  const totalPages = Math.ceil(samples.length / pageSize)
  const paged = samples.slice(page * pageSize, (page + 1) * pageSize)

  const handleCsvExport = () => {
    setExportState("loading")
    setTimeout(() => {
      const boundaryTypeLabel: Record<string, string> = {
        normal: "正常",
        empty_set: "空集合",
        zero_value: "零值占位",
        extrapolation_overflow: "外推越界",
      }
      const reviewStatusLabel: Record<string, string> = {
        pending: "待复核",
        confirmed: "已确认",
        overridden: "已改判",
      }
      const data = samples.map((s) => ({
        ID: s.id,
        批次: s.batchId,
        参数名: s.parameterName,
        原始值: s.originalValue ?? "",
        换算值: s.convertedValue ?? "",
        单位: s.unit,
        换算因子: s.conversionFactor,
        边界类型: boundaryTypeLabel[s.boundaryType] ?? s.boundaryType,
        复核状态: reviewStatusLabel[s.reviewStatus] ?? s.reviewStatus,
        来源材料ID: s.sourceMaterialId,
        影响结论ID: s.affectedConclusionId,
        补录说明: s.supplementNote,
      }))
      const csv = "\uFEFF" + Papa.unparse(data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "概率抽样边界复核_明细.csv"
      a.click()
      URL.revokeObjectURL(url)
      setExportState("done")
      setTimeout(() => setExportState("idle"), 2000)
    }, 600)
  }

  const allSelected = samples.length > 0 && selectedSampleIds.length === samples.length
  const someSelected = selectedSampleIds.length > 0 && !allSelected

  const handleSelectAll = () => {
    if (allSelected) clearSelection()
    else selectAllFiltered()
  }

  const handleConfirm = () => {
    if (selectedSampleIds.length === 0) return
    confirmSamples(selectedSampleIds)
    clearSelection()
  }

  const cards = [
    { icon: Database, value: stats.totalSamples, label: "总样本", accent: "#3b82f6" },
    { icon: AlertTriangle, value: stats.boundaryAnomalies, label: "边界异常", accent: "#f59e0b" },
    { icon: Clock, value: stats.pendingReview, label: "待复核", accent: "#f97316" },
    { icon: PenLine, value: stats.overridden, label: "已改判", accent: "#10b981" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select className={selectCls} value={filter.batchId} onChange={(e) => setFilter({ batchId: e.target.value })}>
          <option value="">全部批次</option>
          {batchIds.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className={selectCls} value={filter.parameterName} onChange={(e) => setFilter({ parameterName: e.target.value })}>
          <option value="">全部参数</option>
          {paramNames.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={selectCls} value={filter.boundaryType} onChange={(e) => setFilter({ boundaryType: e.target.value as BoundaryType | "" })}>
          <option value="">全部边界类型</option>
          <option value="normal">正常</option>
          <option value="empty_set">空集合</option>
          <option value="zero_value">零值</option>
          <option value="extrapolation_overflow">外推溢出</option>
        </select>
        <select className={selectCls} value={filter.reviewStatus} onChange={(e) => setFilter({ reviewStatus: e.target.value as ReviewStatus | "" })}>
          <option value="">全部状态</option>
          <option value="pending">待复核</option>
          <option value="confirmed">已确认</option>
          <option value="overridden">已改判</option>
        </select>
        <button onClick={resetFilter} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="bg-[#151a2e] rounded-xl border border-[#1e2440] p-4 flex items-center gap-4"
            style={{ borderLeftWidth: 3, borderLeftColor: card.accent }}
          >
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${card.accent}15` }}>
              <card.icon size={20} style={{ color: card.accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100 tabular-nums">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              ref={(el) => { if (el) el.indeterminate = someSelected }}
              checked={allSelected}
              onChange={handleSelectAll}
              className="accent-amber-500 w-4 h-4"
            />
            全选
            {selectedSampleIds.length > 0 && (
              <span className="text-amber-500 text-xs">({selectedSampleIds.length})</span>
            )}
          </label>
          <button
            onClick={handleConfirm}
            disabled={selectedSampleIds.length === 0}
            className={clsx(
              "px-3.5 py-1.5 text-sm rounded-md font-medium transition-colors",
              selectedSampleIds.length > 0
                ? "bg-amber-500 text-gray-900 hover:bg-amber-400"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            确认复核
          </button>
          <Link
            to="/anomalies"
            className="px-3.5 py-1.5 text-sm rounded-md border border-[#1e2440] text-gray-300 hover:bg-white/5 transition-colors"
          >
            跳转异常
          </Link>
        </div>
        <button
          onClick={handleCsvExport}
          disabled={exportState === "loading"}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-md border border-[#1e2440] text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          {exportState === "loading" ? "导出中..." : exportState === "done" ? "已导出 ✓" : "导出CSV"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e2440]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0f1219] text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-10" />
              <th className="px-3 py-3 text-left">样本ID</th>
              <th className="px-3 py-3 text-left">批次</th>
              <th className="px-3 py-3 text-left">参数名</th>
              <th className="px-3 py-3 text-right">原始值</th>
              <th className="px-3 py-3 text-right">换算值</th>
              <th className="px-3 py-3 text-left">单位</th>
              <th className="px-3 py-3 text-right">换算因子</th>
              <th className="px-3 py-3 text-left">边界类型</th>
              <th className="px-3 py-3 text-left">复核状态</th>
              <th className="px-3 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s, idx) => (
              <tr
                key={s.id}
                className={clsx(
                  "border-t border-[#1e2440] transition-colors",
                  idx % 2 === 0 ? "bg-[#151a2e]" : "bg-[#12172b]",
                  selectedSampleIds.includes(s.id) && "bg-amber-500/5",
                  "hover:bg-white/[0.03]"
                )}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedSampleIds.includes(s.id)}
                    onChange={() => toggleSampleSelection(s.id)}
                    className="accent-amber-500 w-4 h-4"
                  />
                </td>
                <td className="px-3 py-2.5 text-gray-200 font-medium">{s.id}</td>
                <td className="px-3 py-2.5 text-gray-400">{s.batchId}</td>
                <td className="px-3 py-2.5 text-gray-300">{s.parameterName}</td>
                <td className="px-3 py-2.5 text-right">
                  <ValueCell value={s.originalValue} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ValueCell value={s.convertedValue} unit={s.displayUnit || undefined} />
                </td>
                <td className="px-3 py-2.5 text-gray-400">{s.unit}</td>
                <td className="px-3 py-2.5 text-right">
                  {s.conversionFactor === 1 ? (
                    <span className="text-gray-600">—</span>
                  ) : (
                    <span className="text-amber-400 font-medium">{s.conversionFactor}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", boundaryColors[s.boundaryType])}>
                    {boundaryLabels[s.boundaryType]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[s.reviewStatus])}>
                    {statusLabels[s.reviewStatus]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {s.supplementNote && (
                      <span className="group relative inline-flex">
                        <Info size={14} className="text-gray-500 hover:text-gray-300 cursor-help" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 rounded-md bg-[#0f1219] border border-[#1e2440] text-xs text-gray-300 text-left z-10 shadow-xl">
                          {s.supplementNote}
                        </span>
                      </span>
                    )}
                    <Link to={`/review/${s.id}`} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-colors">
                      <PenLine size={15} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={clsx("p-1.5 rounded-md border border-[#1e2440]", page === 0 ? "text-gray-700 cursor-not-allowed" : "hover:bg-white/5 hover:text-gray-200")}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tabular-nums">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className={clsx("p-1.5 rounded-md border border-[#1e2440]", page === totalPages - 1 ? "text-gray-700 cursor-not-allowed" : "hover:bg-white/5 hover:text-gray-200")}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
