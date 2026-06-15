import { useOceanStore } from "@/store/useOceanStore"
import ConsistencyCheckBar from "@/components/ConsistencyCheckBar"
import ReportView from "@/components/ReportView"
import FleetView from "@/components/FleetView"
import { FileText, Eye, Ship } from "lucide-react"

export default function Report() {
  const { sampleLoaded, viewMode, setViewMode } = useOceanStore()

  if (!sampleLoaded) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          请先在潮汐计算页面加载示例数据
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ocean-ink">复核报告</h2>
          <p className="text-sm text-gray-400 mt-1">
            统一呈现 · 图表文字一致 · 船队可读
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
          <button
            className={`text-xs px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
              viewMode === "full"
                ? "bg-ocean-deep text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewMode("full")}
          >
            <Eye size={12} />
            完整视图
          </button>
          <button
            className={`text-xs px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
              viewMode === "fleet"
                ? "bg-ocean-deep text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewMode("fleet")}
          >
            <Ship size={12} />
            船队视图
          </button>
        </div>
      </div>

      <ConsistencyCheckBar />

      {viewMode === "full" ? <ReportView /> : <FleetView />}
    </div>
  )
}
