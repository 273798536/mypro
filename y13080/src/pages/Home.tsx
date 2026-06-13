import { useRef, useState } from 'react'
import { TopToolbar } from '@/components/TopToolbar'
import { WarehouseScene } from '@/components/WarehouseScene'
import { SideDetailPanel } from '@/components/SideDetailPanel'
import { BottomCaption } from '@/components/BottomCaption'

export default function Home() {
  const captureRef = useRef<HTMLDivElement>(null)
  const [flash, setFlash] = useState(false)

  const triggerFlash = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 180)
  }

  return (
    <div className="min-h-screen bg-wharf-950 text-steel-100 flex flex-col p-4 gap-4 relative">
      {flash && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-pulse opacity-80" />
      )}

      <TopToolbar captureRef={captureRef} onFlash={triggerFlash} />

      <div
        ref={captureRef}
        className="flex-1 flex flex-col gap-4 min-h-0"
        data-export-container="true"
      >
        <div className="flex gap-4 flex-1 min-h-0">
          <WarehouseScene />
          <SideDetailPanel />
        </div>
        <BottomCaption />
      </div>

      <div className="text-center text-xs text-steel-600 font-mono">
        码头危险品库空间复核系统 v1.0 | 工业级数据复核平台
      </div>
    </div>
  )
}
