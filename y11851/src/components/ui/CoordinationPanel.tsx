import { useStore } from '@/store/useStore'
import { COORDINATION_STATUS_LABELS, CONFLICT_TYPE_LABELS } from '@/types'
import { coordinationRecords, conflicts, manholes } from '@/data/sampleData'
import { ClipboardList, User, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react'

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle,
  obsolete_invalidated: XCircle,
}

const STATUS_COLORS = {
  pending: '#e67e22',
  confirmed: '#27ae60',
  obsolete_invalidated: '#9b59b6',
}

export default function CoordinationPanel() {
  const selectedConflictId = useStore((s) => s.selectedConflictId)

  const filteredRecords = selectedConflictId
    ? coordinationRecords.filter((r) => r.conflictId === selectedConflictId)
    : coordinationRecords

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
        <ClipboardList size={14} />
        协调记录
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {filteredRecords.map((record) => {
          const conflict = conflicts.find((c) => c.id === record.conflictId)
          const StatusIcon = STATUS_ICONS[record.status]
          const statusColor = STATUS_COLORS[record.status]
          const involvedManholes = conflict
            ? manholes.filter((m) => conflict.involvedManholeIds.includes(m.id))
            : []

          return (
            <div
              key={record.id}
              className="rounded-lg p-2.5"
              style={{
                background: 'rgba(26,35,50,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <StatusIcon size={12} style={{ color: statusColor }} />
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: `${statusColor}20`,
                      color: statusColor,
                    }}
                  >
                    {COORDINATION_STATUS_LABELS[record.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Calendar size={10} />
                  {record.date}
                </div>
              </div>

              {conflict && (
                <div className="text-[10px] text-zinc-400 mt-1">
                  关联冲突: {CONFLICT_TYPE_LABELS[conflict.type]} ({conflict.id})
                  {involvedManholes.length > 0 && (
                    <span className="ml-1">
                      | 井盖: {involvedManholes.map((m) => m.label).join(', ')}
                    </span>
                  )}
                </div>
              )}

              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                {record.content}
              </p>

              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-500">
                <User size={10} />
                {record.parties}
              </div>

              {record.resolution && (
                <div className="mt-1.5 text-[10px] text-zinc-300 bg-zinc-800/50 rounded px-2 py-1">
                  处理结果: {record.resolution}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedConflictId && (
        <div className="text-[10px] text-zinc-500">
          显示冲突 {selectedConflictId} 的关联记录（{filteredRecords.length}条）
        </div>
      )}
    </div>
  )
}
