import { AuthorizationEntry, OverrideRecord, ScreenshotRecord, useStore } from '@/store/useStore'
import { AlertTriangle, ChevronDown, ChevronRight, Edit3, Eye, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import AliasConflictModal from './AliasConflictModal'
import OverrideTimeline from './OverrideTimeline'

function StatusBadge({ status }: { status: AuthorizationEntry['status'] }) {
  const map: Record<AuthorizationEntry['status'], { label: string; cls: string }> = {
    aligned: { label: '已对齐', cls: 'badge-aligned' },
    conflict: { label: '别名冲突', cls: 'badge-conflict' },
    overridden: { label: '人工改判', cls: 'badge-overridden' },
    missing_period: { label: '缺期限', cls: 'badge-missing' },
  }
  const { label, cls } = map[status]
  return <span className={cls}>{label}</span>
}

function MiniRatioBar({ ratio }: { ratio: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-driftwood">
      <div className="w-20 h-2 bg-sandstone rounded-full overflow-hidden">
        <div
          className="h-full bg-moss rounded-full transition-all"
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="font-medium text-inkstone">{ratio}%</span>
    </div>
  )
}

export default function EntryCard({ entry }: { entry: AuthorizationEntry }) {
  const [expanded, setExpanded] = useState(false)
  const allScreenshots = useStore((s) => s.screenshots)
  const allOverrides = useStore((s) => s.overrides)
  const setConflictModalEntryId = useStore((s) => s.setConflictModalEntryId)
  const overrides = useMemo(() => allOverrides.filter((o: OverrideRecord) => o.entryId === entry.id), [allOverrides, entry.id])
  const linkedScreenshots = useMemo(() => allScreenshots.filter((s: ScreenshotRecord) => entry.screenshotIds.includes(s.id)), [allScreenshots, entry.screenshotIds])

  return (
    <div
      className={`relative bg-white rounded-lg border border-sandstone/60 shadow-sm hover:shadow-md transition-shadow ${
        entry.status === 'overridden' ? 'border-l-4 border-l-amber' : ''
      } ${entry.status === 'conflict' ? 'border-l-4 border-l-ochre' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-base font-semibold text-inkstone truncate">{entry.songName}</h3>
            {entry.aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {entry.aliases.map((alias) => (
                  <button
                    key={alias}
                    onClick={() => setConflictModalEntryId(entry.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      entry.status === 'conflict'
                        ? 'bg-ochre/15 text-ochre hover:bg-ochre/25 cursor-pointer'
                        : 'bg-sandstone text-driftwood'
                    }`}
                  >
                    {alias}
                    {entry.status === 'conflict' && <AlertTriangle size={10} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <StatusBadge status={entry.status} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-driftwood">授权期限</span>
            <span className={entry.authorizationPeriod ? 'text-inkstone' : 'text-ochre italic text-xs'}>
              {entry.authorizationPeriod
                ? `${entry.authorizationPeriod.start} ~ ${entry.authorizationPeriod.end}`
                : '未填写'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-driftwood">分账比例</span>
            <MiniRatioBar ratio={entry.revenueShareRatio} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-driftwood">关联截图</span>
            <span className="text-inkstone">{linkedScreenshots.length} 条</span>
          </div>
        </div>

        {overrides.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center gap-2 text-xs text-amber hover:text-amber/80 transition-colors py-1.5 border-t border-sandstone/40"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Edit3 size={12} />
            <span>改判记录 ({overrides.length})</span>
          </button>
        )}

        {expanded && overrides.length > 0 && (
          <div className="mt-2">
            <OverrideTimeline overrides={overrides} />
          </div>
        )}

        {linkedScreenshots.length > 0 && (
          <div className="mt-3 pt-3 border-t border-sandstone/40">
            <p className="text-xs text-driftwood mb-2 flex items-center gap-1">
              <Eye size={12} />
              截图溯源
            </p>
            <div className="space-y-1.5">
              {linkedScreenshots.map((ss) => (
                <div key={ss.id} className="text-xs bg-parchment/60 rounded px-2 py-1.5">
                  <span className="text-driftwood">{ss.sourceGroup} · {ss.speaker}</span>
                  <p className="text-inkstone/70 mt-0.5 truncate">"{ss.rawText.slice(0, 40)}…"</p>
                  {ss.authorizationPeriodFromNote && (
                    <p className="text-amber mt-0.5">
                      <FileText size={10} className="inline mr-1" />
                      备注期限：{ss.authorizationPeriodFromNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AliasConflictModal entry={entry} />
    </div>
  )
}

export function EntryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-sandstone/60 p-4 animate-pulse">
      <div className="h-5 bg-sandstone rounded w-1/3 mb-3" />
      <div className="h-3 bg-sandstone rounded w-1/2 mb-2" />
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-sandstone rounded w-2/3" />
        <div className="h-3 bg-sandstone rounded w-1/2" />
        <div className="h-3 bg-sandstone rounded w-3/4" />
      </div>
    </div>
  )
}
