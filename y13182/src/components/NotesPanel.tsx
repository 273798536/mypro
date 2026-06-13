import { StickyNote, Link2, ImageOff } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import { formatTimeFull } from '@/data/mockData'

export default function NotesPanel() {
  const snapshots = useReplayStore((s) => s.snapshots)
  const currentTimestamp = useReplayStore((s) => s.currentTimestamp)
  const getNotesForSnapshot = useReplayStore((s) => s.getNotesForSnapshot)
  const selectNote = useReplayStore((s) => s.selectNote)
  const setShowImpactChain = useReplayStore((s) => s.setShowImpactChain)

  const closestSnapshot = snapshots.reduce<typeof snapshots[0] | null>((prev, curr) => {
    if (!prev) return curr
    return Math.abs(curr.timestamp - currentTimestamp) < Math.abs(prev.timestamp - currentTimestamp)
      ? curr
      : prev
  }, null)

  const notes = closestSnapshot ? getNotesForSnapshot(closestSnapshot.id) : []

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{ background: '#1a2332' }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 shrink-0">
        <StickyNote className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-slate-200" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
          备注
        </span>
        {closestSnapshot && (
          <span
            className="ml-auto text-xs text-slate-500"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {formatTimeFull(closestSnapshot.timestamp)}
          </span>
        )}
      </div>

      <div className="flex-1 p-3 space-y-3">
        {notes.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
            当前时刻无备注
          </div>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-slate-700 p-3 space-y-2"
            style={{ background: '#0f172a' }}
          >
            <div className="flex items-start gap-2">
              {note.isRetrospective && (
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-900"
                  style={{ background: '#f59e0b', fontFamily: '"Noto Sans SC", sans-serif' }}
                >
                  后补
                </span>
              )}
              <p
                className="text-sm text-slate-300 leading-relaxed flex-1"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
              >
                {note.content}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-xs text-slate-500"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {formatTimeFull(note.originalTimestamp)}
              </span>

              {note.isRetrospective && (
                <span
                  className="text-xs text-sky-400/70"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  补记于 {formatTimeFull(note.addedTimestamp)}
                </span>
              )}
            </div>

            {note.isRetrospective && (
              <button
                onClick={() => {
                  selectNote(note.id)
                  setShowImpactChain(true)
                }}
                className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
                style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
              >
                <Link2 className="w-3.5 h-3.5" />
                查看影响链路
              </button>
            )}

            {note.versionScreenshotUrl && (
              <div className="flex items-center gap-1.5 rounded border border-dashed border-slate-600 px-2 py-1.5 bg-slate-800/40">
                <ImageOff className="w-3.5 h-3.5 text-slate-500" />
                <span
                  className="text-xs text-slate-500"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  旧版本截图: {note.versionScreenshotUrl}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
