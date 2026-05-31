import { useStore } from '@/store/index'
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export function DetailPanel() {
  const musician = useStore((s) =>
    s.musicians.find((m) => m.id === s.selectedMusicianId)
  )
  const [collapsed, setCollapsed] = useState(false)

  if (!musician) return null

  return (
    <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#1e2a42]/30 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-[#d4a855]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#d4a855]" />
        )}
        <span className="text-[#d4a855] text-sm font-medium">对应关系</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          <div className="rounded bg-[#0a0e1a] border border-[#1e2a42] px-2.5 py-2">
            <span className="text-[#d4a855] text-xs font-medium block mb-1">位置</span>
            <span
              className="text-white text-sm"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ({musician.position.x}, {musician.position.y}, {musician.position.z})
            </span>
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 text-[#d4a855]" />
              <span className="text-[#8a94a8] text-[10px]">声压级由位置辐射角决定</span>
            </div>
          </div>

          <div className="rounded bg-[#0a0e1a] border border-[#1e2a42] px-2.5 py-2">
            <span className="text-[#d4a855] text-xs font-medium block mb-1">乐器声压</span>
            <span
              className="text-white text-sm"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {musician.soundPressure} dB
            </span>
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 text-[#d4a855]" />
              <span className="text-[#8a94a8] text-[10px]">报告记录声压与位置的综合评估</span>
            </div>
          </div>

          <div className="rounded bg-[#0a0e1a] border border-[#1e2a42] px-2.5 py-2">
            <span className="text-[#d4a855] text-xs font-medium block mb-1">报告说明</span>
            <span className="text-white text-sm leading-relaxed">
              {musician.reportNote || '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
