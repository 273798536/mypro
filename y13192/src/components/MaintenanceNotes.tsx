import { AlertCircle } from 'lucide-react'
import { maintenanceNotes, cells } from '@/data/mockData'
import type { SourceType } from '@/types'

const sourceTypeConfig: Record<SourceType, { label: string; className: string }> = {
  written: { label: '书面', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  oral: { label: '口头', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  temporary: { label: '临时', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
}

export default function MaintenanceNotes() {
  const sorted = [...maintenanceNotes].sort((a, b) => a.createdAt - b.createdAt)

  return (
    <div className="space-y-3 p-4" style={{ background: '#1a1a2e' }}>
      <h2 className="text-lg font-semibold text-amber-400 mb-4">维护记录</h2>
      {sorted.map((note) => {
        const cell = cells.find((c) => c.id === note.cellId)
        const config = sourceTypeConfig[note.sourceType]

        return (
          <div
            key={note.id}
            className="rounded-lg border border-gray-700/50 p-3 transition-colors hover:border-amber-500/30"
            style={{ background: '#16213e' }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm text-gray-200 leading-relaxed flex-1">{note.content}</p>
              {note.conflictsWithMaterial && (
                <span className="flex items-center gap-1 shrink-0 text-red-400 text-xs font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  与材料矛盾
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-400">{note.sourceName}</span>
              {cell && (
                <span className="text-xs text-gray-500">
                  位置: R{cell.row} C{cell.col} ({cell.moduleName})
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
