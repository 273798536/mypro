import { useReplayStore } from '@/store/replayStore'
import { parameterLabels, parameterUnits, type ParameterKey } from '@/types'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { findNotesForParameter } from '@/utils/linkage'

interface ManualOverrideLite {
  oldValue: number
  newValue: number
  sourceNoteLine: string
  sourceNoteObject: string
}

const paramKeys: ParameterKey[] = ['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure']

export default function ParameterTable() {
  const { rawParameters, appliedParameters, overrides, noiseFlags, repairNotes } = useReplayStore()

  const noiseParamIds = new Set(
    noiseFlags.filter((nf) => nf.isNoise).map((nf) => nf.parameterId),
  )

  const overrideMap = new Map<string, ManualOverrideLite>()
  overrides.forEach((ov) => {
    overrideMap.set(`${ov.buoyId}-${ov.timestamp}-${ov.parameterName}`, {
      oldValue: ov.oldValue,
      newValue: ov.newValue,
      sourceNoteLine: ov.sourceNoteLine,
      sourceNoteObject: ov.sourceNoteObject,
    })
  })

  function formatTime(ts: string): string {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="bg-slate-800/50 rounded-sm border border-slate-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">参数明细表</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3 h-3" /> 改判行
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3 h-3" /> 噪声行
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" /> 坏数据
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="bg-slate-700/50 sticky top-0">
            <tr className="text-slate-300">
              <th className="px-3 py-2 text-left font-medium">时间</th>
              {paramKeys.map((k) => (
                <th key={k} className="px-3 py-2 text-right font-medium">
                  {parameterLabels[k]}（{parameterUnits[k]}）
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {appliedParameters.map((param, idx) => {
              const isNoise = noiseParamIds.has(param.id)
              const hasOverride = paramKeys.some(
                (k) => overrideMap.has(`${param.buoyId}-${param.timestamp}-${k}`),
              )

              let rowClass = 'text-slate-300'
              if (isNoise) rowClass = 'text-amber-300/70 line-through'
              else if (hasOverride) rowClass = 'text-green-300'

              const relatedNotes = findNotesForParameter(repairNotes, param)

              return (
                <tr
                  key={param.id}
                  className={`border-t border-slate-700/50 ${rowClass} hover:bg-slate-700/30`}
                >
                  <td className="px-3 py-1.5 font-mono">{formatTime(param.timestamp)}</td>
                  {paramKeys.map((k) => {
                    const key = `${param.buoyId}-${param.timestamp}-${k}`
                    const ov = overrideMap.get(key)
                    const rawVal = (rawParameters[idx] as any)[k] as number
                    const appliedVal = (param as any)[k] as number
                    const isChanged = ov !== undefined

                    return (
                      <td
                        key={k}
                        className={`px-3 py-1.5 text-right font-mono ${
                          isChanged ? 'text-green-300 font-semibold' : ''
                        }`}
                        title={isChanged ? `原值 ${ov!.oldValue} → 改判值 ${ov!.newValue}` : ''}
                      >
                        {isChanged ? (
                          <span>
                            <span className="text-slate-500 line-through text-[10px]">
                              {ov!.oldValue}
                            </span>{' '}
                            → {appliedVal.toFixed(1)}
                          </span>
                        ) : (
                          appliedVal.toFixed(1)
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-1.5 text-slate-500 max-w-xs truncate">
                    {relatedNotes.length > 0 ? (
                      <span
                        className="text-amber-400/80"
                        title={relatedNotes.map((n) => `[${n.lineNumber}] ${n.content}`).join('\n')}
                      >
                        📝 {relatedNotes.map((n) => n.lineNumber).join('、')}
                      </span>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
