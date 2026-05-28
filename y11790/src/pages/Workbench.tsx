import { useRef } from 'react'
import { Suspense } from 'react'
import Scene3D from '../components/Scene3D'
import ParamPanel from '../components/ParamPanel'
import CalcDetail from '../components/CalcDetail'
import RecordList from '../components/RecordList'
import WarningBar from '../components/WarningBar'
import CorrectionTimeline from '../components/CorrectionTimeline'
import ExportButton from '../components/ExportButton'
import { usePulleyStore } from '../store/pulleyStore'
import { Settings2 } from 'lucide-react'

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0d1117] rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#8899aa]">加载3D场景...</span>
      </div>
    </div>
  )
}

export default function Workbench() {
  const exportRef = useRef<HTMLDivElement>(null)
  const record = usePulleyStore((s) => s.getActiveRecord())
  const result = usePulleyStore((s) => s.getActiveResult())

  return (
    <div className="h-screen bg-[#0d1117] text-white overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#253345] bg-[#0d1117]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-[#ff6b35]" />
          <h1 className="text-lg font-mono font-bold tracking-tight">
            滑轮组<span className="text-[#ff6b35]">省力</span>计算器
          </h1>
          <span className="text-[10px] font-mono text-[#556677] bg-[#1a2332] px-2 py-0.5 rounded">
            初中物理
          </span>
        </div>
        <div className="flex items-center gap-3">
          {record && result && (
            <div className="flex items-center gap-4 text-xs font-mono mr-4">
              <span className="text-[#8899aa]">
                绳段 <span className="text-white">{result.ropeSegments}</span>
              </span>
              <span className="text-[#8899aa]">
                拉力 <span className={result.pullingForce ? 'text-[#ff6b35]' : 'text-[#ef4444]'}>
                  {result.pullingForce?.toFixed(2) ?? '—'} N
                </span>
              </span>
              <span className="text-[#8899aa]">
                效率 <span className={
                  result.mechanicalEfficiency !== null && result.mechanicalEfficiency > 100
                    ? 'text-[#ef4444]'
                    : result.mechanicalEfficiency !== null && result.mechanicalEfficiency > 0
                      ? 'text-[#00d4aa]'
                      : 'text-[#8899aa]'
                }>
                  {result.mechanicalEfficiency?.toFixed(1) ?? '—'}%
                </span>
              </span>
            </div>
          )}
          <ExportButton targetRef={exportRef} />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div ref={exportRef} className="flex-1 p-4">
          <Suspense fallback={<LoadingFallback />}>
            <Scene3D />
          </Suspense>
        </div>

        <aside className="w-[380px] border-l border-[#253345] bg-[#0d1117] overflow-y-auto">
          <div className="p-4 space-y-3">
            <WarningBar />
            <RecordList />
            <ParamPanel />
            <CalcDetail />
            <CorrectionTimeline />
          </div>
        </aside>
      </div>
    </div>
  )
}
