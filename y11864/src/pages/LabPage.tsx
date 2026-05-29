import { useState, useCallback } from 'react'
import Scene3D from '@/components/Scene3D'
import ParamPanel from '@/components/ParamPanel'
import TimelinePlayer from '@/components/TimelinePlayer'
import AnomalyPanel from '@/components/AnomalyPanel'
import ComparisonView from '@/components/ComparisonView'
import TraceCard from '@/components/TraceCard'
import WarningBanner from '@/components/WarningBanner'
import { useSimStore } from '@/store/useSimStore'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'

export default function LabPage() {
  const trajectories = useSimStore(s => s.trajectories)
  const activeId = useSimStore(s => s.activeTrajectoryId)
  const validationErrors = useSimStore(s => s.validationErrors)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [traceResult, setTraceResult] = useState<string | null>(null)
  const [dismissedWarnings, setDismissedWarnings] = useState(false)

  const activeTraj = trajectories.find(t => t.id === activeId)
  const trajectoryAnomalies = activeTraj?.anomalies ?? []
  const allWarnings = [...validationErrors, ...trajectoryAnomalies]
  const showWarnings = allWarnings.length > 0 && !dismissedWarnings

  const handleTrace = useCallback((id: string) => {
    setTraceResult(prev => prev === id ? null : id)
  }, [])

  const traceTraj = traceResult ? trajectories.find(t => t.id === traceResult) : null

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e17] text-[#c8d0dc] overflow-hidden">
      <div className="h-10 bg-[#0d1117] border-b border-[#1e2a3a] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          <h1 className="text-xs font-bold tracking-[0.2em] text-[#00d4ff] uppercase">弹道抛物线实验室</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTraj && (
            <button
              onClick={() => handleTrace(activeTraj.id)}
              className="text-[10px] text-[#8892a4] hover:text-[#00d4ff] px-2 py-1 rounded bg-[#1a1f2e] transition-colors"
            >
              溯源
            </button>
          )}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="text-[#8892a4] hover:text-[#c8d0dc] transition-colors"
          >
            {showRightPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ParamPanel />

        <div className="flex-1 relative">
          {showWarnings && (
            <WarningBanner
              anomalies={allWarnings}
              onDismiss={() => setDismissedWarnings(true)}
            />
          )}

          <Scene3D />

          <ComparisonView />

          {traceTraj && (
            <TraceCard result={traceTraj} onClose={() => setTraceResult(null)} />
          )}

          {trajectories.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">🚀</div>
                <p className="text-sm text-[#8892a4]">设置参数后点击「发射」开始实验</p>
                <p className="text-[10px] text-[#4a5568] mt-1">调整初速度、角度和阻力系数对比弹道轨迹</p>
              </div>
            </div>
          )}
        </div>

        {showRightPanel && <AnomalyPanel />}
      </div>

      <TimelinePlayer />
    </div>
  )
}
