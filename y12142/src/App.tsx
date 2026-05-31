import { Suspense } from 'react'
import Scene3D from '@/components/Scene3D'
import FilterBar from '@/components/FilterBar'
import TrendChart from '@/components/TrendChart'
import ThresholdPanel from '@/components/ThresholdPanel'
import MaintenancePanel from '@/components/MaintenancePanel'
import Timeline from '@/components/Timeline'

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e14] text-gray-200 overflow-hidden">
      <header className="shrink-0 border-b border-gray-800 bg-[#0d1117] px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide text-gray-100">电池热失控预警</h1>
        </div>
        <span className="text-xs text-gray-600">|</span>
        <span className="text-xs text-gray-500">储能站一体化监控看板</span>
      </header>

      <div className="shrink-0 px-4 pt-3">
        <FilterBar />
      </div>

      <div className="flex-1 flex min-h-0 px-4 pt-3 pb-1 gap-3">
        <div className="flex-[3] min-w-0">
          <Suspense fallback={
            <div className="w-full h-full bg-[#0a0e14] rounded-lg flex items-center justify-center">
              <div className="text-gray-600 text-sm">加载 3D 场景...</div>
            </div>
          }>
            <Scene3D />
          </Suspense>
        </div>

        <div className="flex-[2] flex flex-col gap-3 min-w-0">
          <div className="flex-[3] min-h-0 overflow-hidden">
            <TrendChart />
          </div>
          <div className="flex-[2] min-h-0 overflow-hidden">
            <ThresholdPanel />
          </div>
          <div className="flex-[2] min-h-0 overflow-hidden">
            <MaintenancePanel />
          </div>
        </div>
      </div>

      <Timeline />
    </div>
  )
}
