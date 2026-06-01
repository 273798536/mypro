import FilterPanel from "@/components/FilterPanel"
import AnomalyCards from "@/components/AnomalyCards"
import ChartArea from "@/components/ChartArea"
import DetailTable from "@/components/DetailTable"
import { Download, Activity } from "lucide-react"
import { useStore } from "@/store/useStore"

export default function Overview() {
  const getFilteredReviews = useStore((s) => s.getFilteredReviews)
  const reviews = getFilteredReviews()

  const handleExport = () => {
    const data = JSON.stringify(reviews, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `calibration-review-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <FilterPanel />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-indigo-400" />
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              频谱仪校准复盘
            </h1>
            <span className="text-xs text-slate-500 ml-2">
              {reviews.length} 条记录
            </span>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
          >
            <Download size={14} />
            导出报告
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <AnomalyCards />
          <ChartArea />
          <DetailTable />
        </div>
      </main>
    </div>
  )
}
