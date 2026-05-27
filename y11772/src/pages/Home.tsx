import { Link } from "react-router-dom"
import { FileCheck } from "lucide-react"
import MountainScene from "@/components/MountainScene"
import { CurrencySwitcher } from "@/components/CurrencySwitcher"
import { DepartmentFilter } from "@/components/DepartmentFilter"
import { DetailPanel } from "@/components/DetailPanel"
import { ExportButton } from "@/components/ExportButton"
import { useStore } from "@/store/useStore"

export default function Home() {
  const selectedItemIds = useStore((s) => s.selectedItemIds)
  const riskFlags = useStore((s) => s.riskFlags)
  const detailPanelOpen = useStore((s) => s.detailPanelOpen)

  const criticalCount = riskFlags.filter((f) => f.severity === "critical").length
  const warningCount = riskFlags.filter((f) => f.severity === "warning").length

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1a1f36] text-white/90 overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-gradient-to-b from-[#4fc3f7] to-[#4fc3f7]/30" />
            <h1 className="text-base font-semibold tracking-tight">
              现金流期限山脉
            </h1>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
            Cash Flow Ridge
          </span>
        </div>

        <div className="flex items-center gap-4">
          <CurrencySwitcher />

          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400">{criticalCount} 严重</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-orange-400">{warningCount} 警告</span>
            </div>
          )}

          <Link
            to="/audit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#4fc3f7]/30 transition-all text-sm"
          >
            <FileCheck className="w-4 h-4 text-white/60" />
            <span className="text-white/70">审计追溯</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-52 shrink-0 border-r border-white/10">
          <DepartmentFilter />
        </aside>

        <div className="flex-1 relative min-w-0">
          <MountainScene />
          <ExportButton />
          {!detailPanelOpen && selectedItemIds.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/30 backdrop-blur-sm pointer-events-none">
              拖拽旋转 · 滚轮缩放 · 点击山脊查看明细
            </div>
          )}
        </div>

        {detailPanelOpen && selectedItemIds.length > 0 && (
          <aside className="shrink-0 border-l border-white/10">
            <DetailPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
