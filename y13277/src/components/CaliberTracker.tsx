import { useState } from 'react'
import { ChevronDown, ChevronUp, Database, Clock, User, AlertCircle, MessageSquare } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface CaliberTrackerProps {
  complaintId: string
}

export default function CaliberTracker({ complaintId }: CaliberTrackerProps) {
  const materials = useAppStore((state) =>
    state.getMaterialsByComplaintId(complaintId)
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasNameMismatch = (name: string, originalName: string) => name !== originalName

  return (
    <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20">
      <h3 className="text-fire-white text-lg font-semibold mb-6 flex items-center gap-2">
        <span className="w-1 h-5 bg-fire-orange rounded-full" />
        材料口径追踪
      </h3>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {materials.map((material) => {
          const isExpanded = expandedIds.has(material.id)
          const nameMismatch = hasNameMismatch(material.name, material.originalName)

          return (
            <div
              key={material.id}
              className="relative bg-fire-deep/50 rounded-xl border border-fire-orange/10 overflow-hidden transition-all duration-300 hover:border-fire-orange/30"
            >
              {material.caliberChanged && (
                <div className="absolute top-0 left-0 right-0 bg-blue-500/20 border-b border-blue-500/30 px-4 py-1.5 flex items-center gap-2">
                  <AlertCircle size={14} className="text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">口径已变更</span>
                </div>
              )}

              <div
                className={`cursor-pointer ${material.caliberChanged ? 'pt-10' : ''}`}
                onClick={() => toggleExpand(material.id)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-fire-white font-medium">
                          {nameMismatch ? (
                            <>
                              <span className="text-red-400 line-through mr-2">
                                {material.originalName}
                              </span>
                              <span>{material.name}</span>
                            </>
                          ) : (
                            material.name
                          )}
                        </h4>
                        {material.oralNote && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded">
                            <MessageSquare size={12} />
                            口头说明
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1 text-fire-white/60">
                          <Database size={14} />
                          <span>{material.source}</span>
                        </div>
                        <div className="flex items-center gap-1 text-fire-white/60">
                          <User size={14} />
                          <span>{material.changedBy}</span>
                        </div>
                        <div className="flex items-center gap-1 text-fire-white/60">
                          <Clock size={14} />
                          <span>{formatTime(material.changedAt)}</span>
                        </div>
                      </div>

                      {material.oralNote && (
                        <p className="text-purple-400 text-sm mt-2 bg-purple-500/10 rounded-lg px-3 py-2">
                          {material.oralNote}
                        </p>
                      )}
                    </div>

                    <button className="text-fire-white/40 hover:text-fire-orange transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && material.caliberChanged && (
                <div className="border-t border-fire-orange/10 p-4 bg-fire-deep/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-fire-white/50 text-sm mb-2">原始口径</p>
                      <div className="bg-fire-deep/70 rounded-lg px-3 py-2 text-fire-white/70 text-sm">
                        {material.originalCaliber}
                      </div>
                    </div>
                    <div>
                      <p className="text-fire-white/50 text-sm mb-2">当前口径</p>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-400 text-sm font-medium">
                        {material.caliber}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
