import ColdStorageScene from '@/components/ColdStorageScene'
import FilterPanel from '@/components/FilterPanel'
import TraceabilityPanel from '@/components/TraceabilityPanel'
import BottomPanel from '@/components/BottomPanel'
import { Snowflake } from 'lucide-react'

export default function Home() {
  return (
    <div className="w-full h-screen bg-[#0f1729] relative overflow-hidden">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700">
        <Snowflake size={20} className="text-cyan-400" />
        <h1 className="text-sm font-semibold text-slate-200">冷库温场立体巡检系统</h1>
        <div className="h-4 w-px bg-slate-600" />
        <div className="text-xs text-slate-400">一号冷库</div>
      </div>

      <FilterPanel />
      <TraceabilityPanel />

      <div className="absolute inset-0">
        <ColdStorageScene />
      </div>

      <BottomPanel />

      <div className="absolute bottom-28 right-4 z-10 flex flex-col gap-1 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#67e8f9' }} />
          <span>&lt; -20°C 正常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
          <span>-20 ~ -15°C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
          <span>-15 ~ -10°C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
          <span>&gt; -10°C 超温</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 rounded-sm animate-pulse" style={{ backgroundColor: '#ef4444' }} />
          <span>探头离线</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 text-xs text-slate-500">
        <div>提示：拖动旋转 | 滚轮缩放</div>
        <div>点击探头查看详情</div>
      </div>
    </div>
  )
}
