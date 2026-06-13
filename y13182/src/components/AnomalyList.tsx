import { AlertTriangle, AlertCircle, PenLine } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import { formatTimeFull } from '@/data/mockData'
import { cn } from '@/lib/utils'
import type { AnomalyRecord } from '@/types'

const typeConfig: Record<AnomalyRecord['type'], { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  threshold_change: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    label: '阈值变更',
  },
  parameter_exceeded: {
    icon: AlertCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    label: '参数超限',
  },
  note_correction: {
    icon: PenLine,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/30',
    label: '备注修正',
  },
}

const resultStyle: Record<AnomalyRecord['processingResult'], string> = {
  '阈值变更': 'bg-red-500/20 text-red-300 border border-red-500/30',
  '参数超限': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  '备注修正': 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
}

export default function AnomalyList() {
  const anomalies = useReplayStore((s) => s.anomalies)
  const selectedAnomalyId = useReplayStore((s) => s.selectedAnomalyId)
  const selectAnomaly = useReplayStore((s) => s.selectAnomaly)
  const snapshots = useReplayStore((s) => s.snapshots)

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly) => {
        const config = typeConfig[anomaly.type]
        const Icon = config.icon
        const isSelected = selectedAnomalyId === anomaly.id
        const snapshot = snapshots.find((s) => s.id === anomaly.relatedSnapshotId)

        return (
          <div
            key={anomaly.id}
            className={cn(
              'cursor-pointer rounded-lg border p-4 transition-all',
              isSelected
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-700/50 bg-[#0f172a] hover:border-slate-600'
            )}
            onClick={() => selectAnomaly(isSelected ? null : anomaly.id)}
          >
            <div className="flex items-start gap-3">
              <div className={cn('shrink-0 rounded-md p-1.5', config.bgColor)}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-semibold',
                      resultStyle[anomaly.processingResult]
                    )}
                    style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
                  >
                    {anomaly.processingResult}
                  </span>
                  <span
                    className="text-xs text-slate-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {formatTimeFull(anomaly.timestamp)}
                  </span>
                </div>

                <p
                  className="text-sm text-slate-300"
                  style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
                >
                  {anomaly.description}
                </p>

                {snapshot && (
                  <p
                    className="mt-1 text-xs text-slate-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    关联快照: {snapshot.id} | 直径{snapshot.dropletDiameter}{snapshot.dropletDiameterUnit} 流量{snapshot.flowRate}{snapshot.flowRateUnit} 温度{snapshot.temperature}{snapshot.temperatureUnit}
                  </p>
                )}
              </div>
            </div>

            {isSelected && anomaly.calculationSteps.length > 0 && (
              <div className="mt-3 border-t border-slate-700/50 pt-3">
                <div className="space-y-2">
                  {anomaly.calculationSteps.map((step) => (
                    <div key={step.step} className="rounded border border-slate-700/40 bg-slate-800/50 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-slate-900"
                          style={{ backgroundColor: '#f59e0b' }}
                        >
                          {step.step}
                        </span>
                        <span
                          className="text-xs text-slate-400"
                          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
                        >
                          {step.description}
                        </span>
                      </div>
                      <div
                        className="mb-1 rounded bg-slate-900/60 px-2 py-1 text-[11px] text-sky-300"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {step.formula}
                      </div>
                      <div className="text-[11px]">
                        <span className="text-slate-500">输入: </span>
                        <span className="text-slate-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{step.input}</span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        <span className="text-slate-500">输出: </span>
                        <span className="text-emerald-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{step.output}</span>
                      </div>
                      {step.unitConversion && (
                        <div className="mt-1 rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 text-[10px] text-amber-400/90" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          ↔ {step.unitConversion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
