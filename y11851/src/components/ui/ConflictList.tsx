import { useStore } from '@/store/useStore'
import {
  CONFLICT_TYPE_LABELS,
  CONFLICT_SEVERITY_COLORS,
  PIPELINE_TYPE_LABELS,
} from '@/types'
import { manholes, pipelines } from '@/data/sampleData'
import { AlertTriangle, MapPin, ChevronRight } from 'lucide-react'

export default function ConflictList() {
  const conflicts = useStore((s) => s.conflicts)
  const showConflicts = useStore((s) => s.showConflicts)
  const toggleShowConflicts = useStore((s) => s.toggleShowConflicts)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const selectConflict = useStore((s) => s.selectConflict)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
          <AlertTriangle size={14} />
          冲突检测
        </div>
        <button
          onClick={toggleShowConflicts}
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            background: showConflicts ? 'rgba(231,76,60,0.2)' : 'rgba(52,152,219,0.2)',
            color: showConflicts ? '#e74c3c' : '#3498db',
            border: `1px solid ${showConflicts ? '#e74c3c' : '#3498db'}`,
          }}
        >
          {showConflicts ? '隐藏冲突' : '检测冲突'}
        </button>
      </div>

      {showConflicts && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {conflicts.map((conflict) => {
            const isSelected = conflict.id === selectedConflictId
            const severityColor = CONFLICT_SEVERITY_COLORS[conflict.severity]
            const involvedManholes = manholes.filter((m) =>
              conflict.involvedManholeIds.includes(m.id)
            )
            const involvedPipelines = pipelines.filter((p) =>
              conflict.involvedPipelineIds.includes(p.id)
            )

            return (
              <div
                key={conflict.id}
                onClick={() => selectConflict(isSelected ? null : conflict.id)}
                className="rounded-lg p-2.5 cursor-pointer transition-all"
                style={{
                  background: isSelected ? 'rgba(231,76,60,0.15)' : 'rgba(26,35,50,0.6)',
                  border: `1px solid ${isSelected ? severityColor : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: severityColor }}
                    />
                    <span className="text-xs font-mono font-bold" style={{ color: severityColor }}>
                      {CONFLICT_TYPE_LABELS[conflict.type]}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {conflict.severity === 'high' ? '高风险' : conflict.severity === 'medium' ? '中风险' : '低风险'}
                    </span>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-zinc-500 transition-transform"
                    style={{ transform: isSelected ? 'rotate(90deg)' : 'none' }}
                  />
                </div>

                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  {conflict.description}
                </p>

                {isSelected && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-700/50">
                    <div className="text-[10px] text-zinc-500">
                      <MapPin size={10} className="inline mr-1" />
                      涉及管线：
                      {involvedPipelines.map((p) => (
                        <span
                          key={p.id}
                          className="inline-block ml-1 px-1 rounded text-[9px]"
                          style={{
                            background: 'rgba(52,152,219,0.15)',
                            color: '#3498db',
                          }}
                        >
                          {p.label}({PIPELINE_TYPE_LABELS[p.type]}{p.version})
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      <MapPin size={10} className="inline mr-1" />
                      涉及井盖：
                      {involvedManholes.map((m) => (
                        <span
                          key={m.id}
                          className="inline-block ml-1 px-1 rounded text-[9px]"
                          style={{
                            background: 'rgba(230,126,34,0.15)',
                            color: '#e67e22',
                          }}
                        >
                          {m.label}(标高{m.elevation.toFixed(1)}m)
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      3D坐标: ({conflict.position.map((v) => v.toFixed(1)).join(', ')})
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showConflicts && (
        <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
          共 {conflicts.length} 条冲突 | 高风险 {conflicts.filter((c) => c.severity === 'high').length} | 中风险 {conflicts.filter((c) => c.severity === 'medium').length}
        </div>
      )}
    </div>
  )
}
