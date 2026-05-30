import SurfaceCanvas from '@/components/SurfaceCanvas'
import ParamPanel from '@/components/ParamPanel'
import CrossSectionPanel from '@/components/CrossSectionPanel'
import ExplanationCard from '@/components/ExplanationCard'
import TracePanel from '@/components/TracePanel'
import Timeline from '@/components/Timeline'
import { useNavigate } from 'react-router-dom'
import { Shield, Beaker } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e8e6e1] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d4a853] to-[#e05555] flex items-center justify-center">
            <span className="text-[9px] font-bold text-[#0a0a0f]">M</span>
          </div>
          <h1 className="text-sm font-['Cormorant_Garamond',serif] tracking-wide">
            数学曲面展厅
          </h1>
          <span className="text-[9px] font-mono text-[#e8e6e1]/20 ml-1">Math Surface Hall</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/protection')}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-md
              border border-white/[0.08] text-[#e8e6e1]/50
              hover:text-[#e8e6e1]/80 hover:bg-white/[0.04] transition-all"
          >
            <Shield className="w-3 h-3" />
            参数保护
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 relative">
          <SurfaceCanvas />
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Timeline />
          </div>
        </main>

        <aside className="w-80 border-l border-white/[0.06] overflow-y-auto p-3 space-y-3
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <ParamPanel />
          <CrossSectionPanel />
          <ExplanationCard />
          <TracePanel />
        </aside>
      </div>
    </div>
  )
}
