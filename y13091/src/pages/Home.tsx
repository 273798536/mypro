import FilterPanel from "@/components/FilterPanel"
import TimelineView from "@/components/TimelineView"
import DetailPanel from "@/components/DetailPanel"
import BridgeModel3D from "@/components/BridgeModel3D"
import ApiReturnPanel from "@/components/ApiReturnPanel"
import { Activity } from "lucide-react"

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f1724] overflow-hidden">
      <header className="flex-shrink-0 h-12 bg-[#0b1019] border-b border-[#1e2d3d] flex items-center px-6">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-[#00e5a0]" />
          <h1 className="text-base font-bold text-white tracking-wide">
            桥隧检修平台
          </h1>
          <span className="text-xs text-[#64748b] border-l border-[#1e2d3d] pl-3 ml-1">
            时序回放
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-[#475569]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a0] animate-pulse" />
            在线
          </span>
          <span>2025-03-10</span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <FilterPanel />

        <div className="flex-1 flex flex-col min-w-0">
          <BridgeModel3D />

          <div className="flex-1 flex min-h-0">
            <TimelineView />
            <DetailPanel />
          </div>
        </div>
      </div>

      <ApiReturnPanel />
    </div>
  )
}
