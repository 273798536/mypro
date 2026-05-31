import { useEffect } from 'react'
import { useStore } from '@/store/index'
import { musicians as sampleMusicians, materials as sampleMaterials } from '@/data/sampleData'
import { Stage } from '@/components/Scene3D/Stage'
import { SidebarPanel } from '@/components/Panel/SidebarPanel'
import { DetailPanel } from '@/components/DetailPanel/DetailPanel'
import { OcclusionPanel } from '@/components/OcclusionPanel/OcclusionPanel'
import { FilterBar } from '@/components/FilterBar/FilterBar'
import { Timeline } from '@/components/Timeline/Timeline'
import { ScreenshotExport } from '@/components/ScreenshotExport/ScreenshotExport'
import { AuditLog } from '@/components/AuditLog/AuditLog'
import { AlertTriangle } from 'lucide-react'

export default function Workspace() {
  const setMusicians = useStore((s) => s.setMusicians)
  const musicians = useStore((s) => s.musicians)
  const materials = useStore((s) => s.materials)
  const setDuration = useStore((s) => s.setDuration)
  const toggleOcclusionPanel = useStore((s) => s.toggleOcclusionPanel)
  const occlusions = useStore((s) => s.occlusions)
  const addAuditEntry = useStore((s) => s.addAuditEntry)

  useEffect(() => {
    if (musicians.length === 0) {
      setMusicians(sampleMusicians)
      setDuration(60)
      addAuditEntry({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: '初始化',
        parameter: '系统',
        oldValue: null,
        newValue: `加载${sampleMusicians.length}位乐手、${sampleMaterials.length}个材料`,
      })
    }
  }, [])

  const occlusionCount = occlusions.length

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0e1a] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#080c16]">
        <div className="flex items-center gap-3">
          <h1 className="text-amber-400 text-base font-semibold tracking-wide">
            交响乐声部覆盖图
          </h1>
          <span className="text-white/30 text-xs">声场可视化工具</span>
        </div>
        <div className="flex items-center gap-2">
          <FilterBar />
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={toggleOcclusionPanel}
            className="relative flex h-9 items-center gap-2 rounded-full border border-amber-400/50 px-3 text-sm text-amber-400 transition-all hover:bg-amber-400/10 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          >
            <AlertTriangle size={14} />
            遮挡检测
            {occlusionCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {occlusionCount}
              </span>
            )}
          </button>
          <ScreenshotExport />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <Stage />
          <div className="absolute bottom-0 left-0 right-0">
            <Timeline />
          </div>
        </div>
        <div className="flex flex-col w-[340px] border-l border-white/10 bg-[#0a0e1a]">
          <SidebarPanel />
          <div className="border-t border-white/10">
            <DetailPanel />
          </div>
        </div>
      </div>

      <OcclusionPanel />
      <AuditLog />
    </div>
  )
}
