import Timeline from '@/components/Timeline'
import ParameterChart from '@/components/ParameterChart'
import NotesPanel from '@/components/NotesPanel'
import ImpactChainModal from '@/components/ImpactChainModal'
import CalculationPanel from '@/components/CalculationPanel'
import { useReplayStore } from '@/store/useReplayStore'
import { Calculator } from 'lucide-react'

export default function ReplayPage() {
  const selectedAnomalyId = useReplayStore((s) => s.selectedAnomalyId)
  const anomalies = useReplayStore((s) => s.anomalies)
  const selectAnomaly = useReplayStore((s) => s.selectAnomaly)
  const showCalcPanel = selectedAnomalyId && anomalies.find((a) => a.id === selectedAnomalyId)?.calculationSteps.length

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <Timeline />

      <main className="flex-1 overflow-y-auto bg-[#0f172a] p-5">
        <ParameterChart />
        {showCalcPanel && (
          <div className="mt-4">
            <CalculationPanel />
          </div>
        )}
        {!showCalcPanel && (
          <div className="mt-4">
            <div className="rounded-lg border border-dashed border-slate-700/40 p-4 text-center">
              <Calculator className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p
                className="text-sm text-slate-500"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
              >
                选择异常记录可查看中间计算过程与单位换算
              </p>
              <button
                onClick={() => {
                  if (anomalies.length > 0) selectAnomaly(anomalies[0].id)
                }}
                className="mt-2 rounded border border-slate-600 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-amber-500 hover:text-amber-400"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
              >
                查看示例计算
              </button>
            </div>
          </div>
        )}
      </main>

      <aside className="w-80 shrink-0 border-l border-slate-700/60">
        <NotesPanel />
      </aside>

      <ImpactChainModal />
    </div>
  )
}
