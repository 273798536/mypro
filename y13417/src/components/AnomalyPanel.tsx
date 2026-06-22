import { useStore } from '../store'
import { getAnomalySuggestion } from '../utils/tarjan'
import { AlertTriangle, CheckCircle, Clock, ArrowRight, FileText } from 'lucide-react'
import { useState } from 'react'
import type { AnomalyType, AnomalyStatus } from '../types'

const typeLabels: Record<AnomalyType, { label: string; color: string }> = {
  overflow: { label: '溢出', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  empty_set: { label: '空集合', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  missing_unit: { label: '缺单位', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  boundary: { label: '边界', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

const statusLabels: Record<AnomalyStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: '待处理', icon: AlertTriangle, color: 'text-amber-400' },
  resolved: { label: '已处理', icon: CheckCircle, color: 'text-emerald-400' },
  deferred: { label: '已延后', icon: ArrowRight, color: 'text-zinc-400' },
}

export default function AnomalyPanel() {
  const { anomalies, selectedProblemId, resolveAnomaly, deferAnomaly, addAnomalyNote } = useStore()
  const [activeNote, setActiveNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const problemAnomalies = anomalies.filter(a => a.problemId === selectedProblemId)

  if (problemAnomalies.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">
        本题无异常
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {problemAnomalies.map(anomaly => {
        const typeConfig = typeLabels[anomaly.type]
        const statusConfig = statusLabels[anomaly.status]
        const StatusIcon = statusConfig.icon
        const suggestion = getAnomalySuggestion(anomaly.type)

        return (
          <div
            key={anomaly.id}
            className={`p-3 rounded-lg border transition-all ${
              anomaly.status === 'pending'
                ? 'bg-red-500/5 border-red-500/20'
                : anomaly.status === 'resolved'
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-zinc-800/50 border-zinc-700/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] ${statusConfig.color}`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-300 leading-relaxed">{anomaly.description}</div>
                <div className="text-[10px] text-zinc-500 italic mt-1">{suggestion}</div>
                {anomaly.resolutionNote && (
                  <div className="mt-1.5 text-[10px] text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">
                    处理备注：{anomaly.resolutionNote}
                  </div>
                )}
              </div>
            </div>

            {anomaly.status === 'pending' && (
              <div className="mt-2 flex items-center gap-1.5">
                {activeNote === anomaly.id ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="输入处理备注..."
                      className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (noteText.trim()) {
                            resolveAnomaly(anomaly.id, noteText.trim())
                          }
                          setActiveNote(null)
                          setNoteText('')
                        }
                        if (e.key === 'Escape') {
                          setActiveNote(null)
                          setNoteText('')
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (noteText.trim()) resolveAnomaly(anomaly.id, noteText.trim())
                        setActiveNote(null)
                        setNoteText('')
                      }}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium transition-colors"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => {
                        deferAnomaly(anomaly.id, noteText.trim() || '暂不处理')
                        setActiveNote(null)
                        setNoteText('')
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-[10px] font-medium transition-colors"
                    >
                      延后
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveNote(anomaly.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium transition-colors"
                    >
                      <CheckCircle className="w-2.5 h-2.5" />
                      处理
                    </button>
                    <button
                      onClick={() => deferAnomaly(anomaly.id, '暂不处理')}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-[10px] font-medium transition-colors"
                    >
                      <ArrowRight className="w-2.5 h-2.5" />
                      延后
                    </button>
                    <button
                      onClick={() => setActiveNote(anomaly.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-[10px] font-medium transition-colors"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      备注
                    </button>
                  </>
                )}
              </div>
            )}

            {anomaly.status !== 'pending' && anomaly.resolvedAt && (
              <div className="mt-1 text-[9px] text-zinc-600">
                {anomaly.status === 'resolved' ? '处理' : '延后'}于 {new Date(anomaly.resolvedAt).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
