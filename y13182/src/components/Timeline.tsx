import { Camera, FileText, AlertTriangle, Clock } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import { buildTimelineNodes, formatTime } from '@/data/mockData'
import type { TimelineNode, TimelineNodeType } from '@/types'
import { cn } from '@/lib/utils'

const iconMap: Record<TimelineNodeType, React.ElementType> = {
  snapshot: Camera,
  note: FileText,
  threshold_change: AlertTriangle,
  retrospective_note: Clock,
}

const colorMap: Record<TimelineNodeType, string> = {
  snapshot: '#38bdf8',
  note: '#94a3b8',
  threshold_change: '#ef4444',
  retrospective_note: '#f59e0b',
}

const ringColorMap: Record<TimelineNodeType, string> = {
  snapshot: 'ring-sky-300',
  note: 'ring-slate-300',
  threshold_change: 'ring-red-300',
  retrospective_note: 'ring-amber-300',
}

export default function Timeline() {
  const snapshots = useReplayStore((s) => s.snapshots)
  const notes = useReplayStore((s) => s.notes)
  const thresholds = useReplayStore((s) => s.thresholds)
  const currentTimestamp = useReplayStore((s) => s.currentTimestamp)
  const selectedSnapshotId = useReplayStore((s) => s.selectedSnapshotId)
  const selectedNoteId = useReplayStore((s) => s.selectedNoteId)
  const selectSnapshot = useReplayStore((s) => s.selectSnapshot)
  const selectNote = useReplayStore((s) => s.selectNote)

  const nodes = buildTimelineNodes(snapshots, notes, thresholds)

  function isSelected(node: TimelineNode): boolean {
    if (node.type === 'snapshot') return selectedSnapshotId === node.id
    if (node.type === 'note' || node.type === 'retrospective_note') return selectedNoteId === node.id
    return false
  }

  function handleClick(node: TimelineNode) {
    if (node.type === 'snapshot') {
      selectSnapshot(node.id)
    } else if (node.type === 'note' || node.type === 'retrospective_note') {
      selectNote(node.id)
    }
  }

  return (
    <aside
      className="w-56 shrink-0 overflow-y-auto border-r border-slate-700/60 bg-[#1a2332]"
      style={{ maxHeight: 'calc(100vh - 4rem)' }}
    >
      <div className="px-3 py-4">
        <h2
          className="mb-4 text-xs font-semibold tracking-wider text-slate-400"
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          时间线
        </h2>

        <div className="relative ml-3">
          <div className="absolute bottom-0 left-[7px] top-0 w-px bg-slate-600/60" />

          <div className="flex flex-col gap-1">
            {nodes.map((node) => {
              const Icon = iconMap[node.type]
              const dotColor = colorMap[node.type]
              const selected = isSelected(node)
              const isCurrent =
                Math.abs(node.timestamp - currentTimestamp) < 30_000

              return (
                <button
                  key={`${node.type}-${node.id}`}
                  type="button"
                  onClick={() => handleClick(node)}
                  className={cn(
                    'group relative flex items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors',
                    'hover:bg-white/5',
                    selected && 'bg-white/10'
                  )}
                >
                  <div className="relative z-10 mt-0.5 flex shrink-0 items-center justify-center">
                    <div
                      className={cn(
                        'flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 transition-shadow',
                        selected
                          ? cn('ring-2', ringColorMap[node.type])
                          : 'border-transparent'
                      )}
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: selected
                          ? `0 0 8px ${dotColor}`
                          : undefined,
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        size={12}
                        style={{ color: dotColor }}
                        className="shrink-0"
                      />
                      <span
                        className="truncate text-xs text-slate-300 group-hover:text-slate-100"
                        style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
                      >
                        {node.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'mt-0.5 block text-[11px] tabular-nums',
                        isCurrent ? 'text-amber-400' : 'text-slate-500'
                      )}
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {formatTime(node.timestamp)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}
