import { useState } from "react"
import { useStore } from "@/store/useStore"
import { exportPageSummary } from "@/utils/export"
import { Download, ChevronDown } from "lucide-react"

type ExportScope = "filtered" | "all"

export function ExportButton() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = (scope: ExportScope) => {
    const criteria =
      scope === "all"
        ? {
            statuses: [] as string[],
            dateRange: null,
            hasAnomaly: null as boolean | null,
            hasManualAnnotation: null as boolean | null,
          }
        : filter
    exportPageSummary(records, criteria as any)
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 bg-studio-amber/15 text-studio-amber border border-studio-amber/30 hover:bg-studio-amber/25 px-4 py-2 rounded transition-all duration-150 text-sm font-medium"
      >
        <Download size={14} />
        导出页面摘要
        <ChevronDown size={12} />
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-studio-card border border-studio-border rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
          <button
            onClick={() => handleExport("filtered")}
            className="w-full text-left px-4 py-2.5 text-sm text-studio-text hover:bg-studio-amber/10 transition-colors"
          >
            导出当前筛选结果
            <span className="block text-xs text-studio-muted">
              含筛选口径、页面摘要和记录详情
            </span>
          </button>
          <div className="border-t border-studio-border" />
          <button
            onClick={() => handleExport("all")}
            className="w-full text-left px-4 py-2.5 text-sm text-studio-text hover:bg-studio-amber/10 transition-colors"
          >
            导出全部记录
            <span className="block text-xs text-studio-muted">
              忽略筛选条件，导出所有数据
            </span>
          </button>
        </div>
      )}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
