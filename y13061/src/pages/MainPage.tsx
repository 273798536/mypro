import { useRef } from 'react'
import { ScanLine } from 'lucide-react'
import Scene3D from '@/components/Scene3D'
import Timeline from '@/components/Timeline'
import FilterPanel from '@/components/FilterPanel'
import ScreenshotPanel, { ScreenshotPanelHandle } from '@/components/ScreenshotPanel'

export default function MainPage() {
  const shotRef = useRef<ScreenshotPanelHandle>(null)

  return (
    <div
      id="capture-root"
      className="relative w-screen h-screen overflow-hidden bg-ink-900 text-slate-100"
    >
      <div className="absolute inset-0 pointer-events-none z-10">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tealx/40 to-amberx/40 border border-white/10 flex items-center justify-center">
            <ScanLine size={16} className="text-tealx" />
          </div>
          <div>
            <div className="font-display text-sm text-slate-100 leading-none">
              地下水监测井时序回放
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              GW-Monitor · TimePlayback · 评审版
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <div className="glass rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-tealx animate-pulse" />
          Web3D 仅服务时序回放判断
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <Scene3D />
      </div>

      <div className="absolute left-4 top-20 bottom-40 z-20 w-72 flex flex-col gap-3">
        <FilterPanel />
      </div>

      <div className="absolute right-4 top-20 bottom-40 z-20 w-80 flex flex-col gap-3">
        <ScreenshotPanel ref={shotRef} />
      </div>

      <div className="absolute left-4 right-4 bottom-4 z-20 flex items-end gap-3">
        <div className="flex-1">
          <Timeline />
        </div>
      </div>
    </div>
  )
}
