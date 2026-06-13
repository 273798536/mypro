import { useReplayStore } from '@/store/replayStore'
import { FileText, Layers } from 'lucide-react'

export default function BadDataTraceCard() {
  const { repairNotes, noiseFlags, overrides } = useReplayStore()

  if (repairNotes.length === 0 && overrides.length === 0) return null

  const linkedNotes = repairNotes.filter(
    (note) =>
      noiseFlags.some((nf) => nf.timestamp === note.timestamp) ||
      overrides.some((ov) => ov.timestamp === note.timestamp),
  )

  if (linkedNotes.length === 0) return null

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-300">坏数据溯源（指向维修备注原始行）</span>
      </div>

      <div className="space-y-2">
        {linkedNotes.map((note) => {
          const relatedOverride = overrides.find((ov) => ov.timestamp === note.timestamp)
          const relatedNoise = noiseFlags.find((nf) => nf.timestamp === note.timestamp)

          return (
            <div
              key={note.id}
              className="bg-slate-800/70 rounded-sm p-3 border border-slate-700 hover:border-red-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs text-red-300 font-medium flex items-center gap-1.5 mb-1">
                    <Layers className="w-3 h-3" />
                    来源：维修备注 {note.lineNumber} · 对象：{note.relatedObject}
                  </div>
                  <div className="text-xs text-slate-300 mb-2">
                    <span className="text-slate-500">备注内容：</span>
                    {note.content}
                  </div>
                  {relatedOverride && (
                    <div className="text-xs text-green-400 bg-green-500/10 rounded-sm px-2 py-1 border border-green-500/20">
                      已改判：{relatedOverride.parameterName === 'waveHeight' ? '波高' : relatedOverride.parameterName}{' '}
                      {relatedOverride.oldValue} → {relatedOverride.newValue}（{relatedOverride.reason}）
                    </div>
                  )}
                  {relatedNoise && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 rounded-sm px-2 py-1 border border-amber-500/20 mt-1">
                      已标记噪声：{relatedNoise.parameterName === 'waveHeight' ? '波高' : relatedNoise.parameterName} ={' '}
                      {relatedNoise.value}
                    </div>
                  )}
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
