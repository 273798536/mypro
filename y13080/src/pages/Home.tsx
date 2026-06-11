import { useRef } from 'react'
import { TopToolbar } from '@/components/TopToolbar'
import { WarehouseScene } from '@/components/WarehouseScene'
import { SideDetailPanel } from '@/components/SideDetailPanel'
import { BottomCaption } from '@/components/BottomCaption'

export default function Home() {
  const captureRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen bg-wharf-950 text-steel-100 flex flex-col p-4 gap-4">
      <TopToolbar captureRef={captureRef} />

      <div ref={captureRef} className="flex-1 flex gap-4 min-h-0">
        <WarehouseScene />
        <SideDetailPanel />
      </div>

      <BottomCaption />

      <div className="text-center text-xs text-steel-600 font-mono">
        码头危险品库空间复核系统 v1.0 | 工业级数据复核平台
      </div>
    </div>
  )
}
