import { StickyNote, Link2, Image, Clock, AlertCircle } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import { formatTimeFull, formatTime } from '@/data/mockData'

function mockOldVersionScreenshot(snapshotId: string, noteId: string) {
  const snapshots = useReplayStore.getState().snapshots
  const snap = snapshots.find((s) => s.id === snapshotId)
  if (!snap) return null

  if (noteId === 'note-3') {
    return {
      title: '水滴直径原始采样记录',
      timestamp: snap.timestamp,
      params: [
        { label: '水滴直径', value: '1.55', unit: 'mm', isCorrected: true, correctedValue: '1.40' },
        { label: '流量', value: '3.79', unit: 'm³/h', isCorrected: false },
        { label: '温度', value: '31.1', unit: '°C', isCorrected: false },
      ],
      conclusion: '接近阈值',
      correctedConclusion: '正常范围',
      filename: 'screenshot-snap4-v1.png',
    }
  }

  if (noteId === 'note-4') {
    return {
      title: '温度原始采样记录',
      timestamp: snap.timestamp,
      params: [
        { label: '水滴直径', value: '1.23', unit: 'mm', isCorrected: false },
        { label: '流量', value: '2.75', unit: 'm³/h', isCorrected: false },
        { label: '温度', value: '32.5', unit: '°C', isCorrected: true, correctedValue: '31.3' },
      ],
      conclusion: '超过调整后阈值',
      correctedConclusion: '低于阈值0.7°C',
      filename: 'screenshot-snap8-v1.png',
    }
  }

  return null
}

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

        {notes.map((note) => {
          const oldScreenshot = note.versionScreenshotUrl ? mockOldVersionScreenshot(note.snapshotId, note.id) : null

          return (
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

              {oldScreenshot && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Image className="w-3 h-3" />
                    <span>旧版本参数截图 · 历史存档</span>
                  </div>

                  <div className="relative rounded border border-slate-600/60 bg-slate-900/70 p-2.5">
                    <div className="absolute -top-2 left-2 flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 border border-red-500/30">
                      <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-[9px] text-red-400" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>已被后补备注覆盖</span>
                    </div>

                    <div className="mb-2 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          {formatTime(oldScreenshot.timestamp)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {oldScreenshot.filename}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {oldScreenshot.params.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>{p.label}</span>
                          <div className="flex items-center gap-1.5">
                            {p.isCorrected ? (
                              <>
                                <span className="text-red-400/70 line-through" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  {p.value}{p.unit}
                                </span>
                                <span className="text-emerald-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                  → {p.correctedValue}{p.unit}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                                {p.value}{p.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-700/60 pt-1.5">
                      <span className="text-[10px] text-slate-500" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
                        原结论
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-red-400/70 line-through" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
                          {oldScreenshot.conclusion}
                        </span>
                        <span className="text-[10px] text-emerald-400" style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
                          → {oldScreenshot.correctedConclusion}
                        </span>
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
