import { useReplayStore } from '@/store/replayStore'
import { FileText, Layers } from 'lucide-react'
import { findOverridesForNote, findNoisesForNote } from '@/utils/linkage'
import { parameterLabels, type ParameterKey } from '@/types'

export default function BadDataTraceCard() {
  const { repairNotes, noiseFlags, overrides, rawParameters } = useReplayStore()

  if (repairNotes.length === 0 && overrides.length === 0) return null

  const paramMap = new Map(rawParameters.map((p) => [p.id, p]))

  const notesWithLinks = repairNotes
    .map((note) => ({
      note,
      linkedOverrides: findOverridesForNote(overrides, note),
      linkedNoises: findNoisesForNote(noiseFlags, note),
    }))
    .filter(
      ({ linkedOverrides, linkedNoises, note }) =>
        linkedOverrides.length > 0 || linkedNoises.length > 0 || note.relatedParameterIds.length > 0,
    )

  if (notesWithLinks.length === 0) return null

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-300">坏数据溯源（指向维修备注原始行）</span>
      </div>

      <div className="space-y-2">
        {notesWithLinks.map(({ note, linkedOverrides, linkedNoises }) => {
          const linkedParams = note.relatedParameterIds
            .map((pid) => paramMap.get(pid))
            .filter(Boolean)

          return (
            <div
              key={note.id}
              className="bg-slate-800/70 rounded-sm p-3 border border-slate-700 hover:border-red-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    来源：{note.lineNumber} · 对象：{note.relatedObject}
                  </div>

                  {linkedParams.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-500">关联数据点：</span>
                      {linkedParams.map((p) => {
                        if (!p) return null
                        const d = new Date(p.timestamp)
                        const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                        return (
                          <span
                            key={p.id}
                            className="ml-1 bg-slate-700/50 px-1.5 py-0.5 rounded-sm font-mono"
                          >
                            {t} 波高{p.waveHeight}m
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">备注内容：</span>
                    {note.content}
                  </div>

                  {linkedOverrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="text-xs text-green-400 bg-green-500/10 rounded-sm px-2 py-1 border border-green-500/20"
                    >
                      已改判：{parameterLabels[ov.parameterName as ParameterKey]}{' '}
                      <span className="text-slate-500 line-through">{ov.oldValue}</span>{' '}
                      → <span className="font-semibold">{ov.newValue}</span>
                      <span className="ml-2 text-slate-500">（{ov.reason} · {ov.operator}）</span>
                    </div>
                  ))}

                  {linkedNoises.map((nf) => (
                    <div
                      key={nf.id}
                      className="text-xs text-amber-400 bg-amber-500/10 rounded-sm px-2 py-1 border border-amber-500/20"
                    >
                      已标记噪声：{parameterLabels[nf.parameterName as ParameterKey]} ={' '}
                      {nf.value}（超 {nf.threshold}）
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(note.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
