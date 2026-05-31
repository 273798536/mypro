import { useState, useRef } from "react"
import { Camera, FileText, RotateCcw, Maximize2, Download, Loader2 } from "lucide-react"
import { useStore } from "@/store/useStore"
import { generateReport, downloadTextFile, captureScreenshot, downloadDataUrl } from "@/utils/exportUtils"
import type { Pipeline, Conflict, CoordinationRecord } from "@/types"

interface ToolbarProps {
  getCanvas: () => HTMLElement | null
}

export default function Toolbar({ getCanvas }: ToolbarProps) {
  const [exporting, setExporting] = useState<string | null>(null)
  const pipelines = useStore((s) => s.pipelines)
  const conflicts = useStore((s) => s.conflicts)
  const coordinationRecords = useStore((s) => s.coordinationRecords)
  const getFilteredPipelines = useStore((s) => s.getFilteredPipelines)
  const setClippingPlane = useStore((s) => s.setClippingPlane)
  const setFilter = useStore((s) => s.setFilter)
  const selectPipeline = useStore((s) => s.selectPipeline)
  const selectConflict = useStore((s) => s.selectConflict)
  const filteredPipelines = getFilteredPipelines()

  const handleScreenshot = async () => {
    setExporting("screenshot")
    const canvas = getCanvas()
    const dataUrl = await captureScreenshot(canvas)
    if (dataUrl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      downloadDataUrl(dataUrl, `管网剖切截图_${timestamp}.png`)
    }
    setExporting(null)
  }

  const handleExportReport = () => {
    setExporting("report")
    const report = generateReport(
      filteredPipelines,
      conflicts,
      coordinationRecords.map((r) => ({
        id: r.id,
        conflictId: r.conflictId,
        action: r.action,
        handler: r.handler,
        timestamp: r.timestamp,
        result: r.result,
        pipelineChanges: r.pipelineChanges,
      }))
    )
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    downloadTextFile(report, `管网冲突检测报告_${timestamp}.txt`)
    setExporting(null)
  }

  const handleReset = () => {
    setClippingPlane({ enabled: true, position: 0, direction: "y" })
    setFilter({
      pipelineTypes: ["gas", "electric", "stormwater", "watersupply", "telecom"],
      riskLevels: ["high", "medium", "low"],
      showConflictsOnly: false,
      searchQuery: "",
    })
    selectPipeline(null)
    selectConflict(null)
  }

  const stats = {
    total: pipelines.length,
    filtered: filteredPipelines.length,
    conflicts: conflicts.filter((c) => c.status !== "resolved").length,
  }

  return (
    <div className="flex items-center justify-between border-b border-[#2a2d36] bg-[#1a1d23] px-4 py-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Maximize2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100">城市地下管网剖切</h1>
            <p className="text-[10px] text-zinc-500">3D 可视化冲突检测平台</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-[#2a2d36] pl-4">
          <div className="text-center">
            <div className="text-xs font-bold text-zinc-100">{stats.filtered}</div>
            <div className="text-[9px] text-zinc-500">管线</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-red-400">{stats.conflicts}</div>
            <div className="text-[9px] text-zinc-500">冲突</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-md border border-[#2a2d36] bg-[#252830] px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#2a2d36] hover:text-zinc-200 transition-colors"
          title="重置视图"
        >
          <RotateCcw size={14} />
          重置
        </button>
        <button
          onClick={handleScreenshot}
          disabled={exporting !== null}
          className="flex items-center gap-1.5 rounded-md border border-[#2a2d36] bg-[#252830] px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#2a2d36] hover:text-zinc-100 transition-colors disabled:opacity-50"
          title="导出截图"
        >
          {exporting === "screenshot" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          截图
        </button>
        <button
          onClick={handleExportReport}
          disabled={exporting !== null}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          title="导出冲突报告"
        >
          {exporting === "report" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          导出报告
        </button>
      </div>
    </div>
  )
}
