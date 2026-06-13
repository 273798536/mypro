import { Calculator, ArrowRightLeft } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'

export default function CalculationPanel() {
  const selectedAnomalyId = useReplayStore((s) => s.selectedAnomalyId)
  const anomalies = useReplayStore((s) => s.anomalies)

  const selectedAnomaly = anomalies.find((a) => a.id === selectedAnomalyId)

  if (!selectedAnomaly || selectedAnomaly.calculationSteps.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-700/50 bg-[#0f172a] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-amber-500" />
        <h3
          className="text-sm font-medium text-slate-300"
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          中间计算过程
        </h3>
      </div>

      <div className="space-y-3">
        {selectedAnomaly.calculationSteps.map((step) => (
          <div key={step.step} className="rounded-md border border-slate-700/40 bg-slate-800/50 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-900"
                style={{ backgroundColor: '#f59e0b' }}
              >
                {step.step}
              </span>
              <span
                className="text-xs font-medium text-slate-400"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
              >
                {step.description}
              </span>
            </div>

            <div
              className="mb-1 rounded bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-sky-300"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {step.formula}
            </div>

            <div className="flex items-start gap-2 text-xs">
              <div className="flex-1">
                <span className="text-slate-500">输入: </span>
                <span
                  className="text-slate-300"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {step.input}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs mt-1">
              <div className="flex-1">
                <span className="text-slate-500">输出: </span>
                <span
                  className="text-emerald-400"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {step.output}
                </span>
              </div>
            </div>

            {step.unitConversion && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                <ArrowRightLeft className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <span
                  className="text-xs text-amber-400/90"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {step.unitConversion}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
