import { useEffect } from "react"
import { useStore } from "@/store/useStore"
import { SummaryBar } from "@/components/SummaryBar"
import { DropZone } from "@/components/DropZone"
import { ScreenshotList } from "@/components/ScreenshotList"
import { FilterPanel } from "@/components/FilterPanel"
import { DetailPanel } from "@/components/DetailPanel"
import { ExportButton } from "@/components/ExportButton"

export function Workbench() {
  const init = useStore((s) => s.init)
  const initialized = useStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) init()
  }, [init, initialized])

  if (!initialized) {
    return (
      <div className="h-screen bg-studio-bg flex items-center justify-center">
        <div className="text-studio-muted text-sm animate-pulse">加载中…</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-studio-bg flex flex-col">
      <SummaryBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[360px] flex-shrink-0 border-r border-studio-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-studio-border">
            <DropZone />
          </div>
          <div className="p-4 border-b border-studio-border">
            <FilterPanel />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-studio-muted">截图列表</span>
              <ExportButton />
            </div>
            <ScreenshotList />
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-studio-bg/50">
          <DetailPanel />
        </div>
      </div>
    </div>
  )
}
