import { AuthorizationEntry, useStore } from '@/store/useStore'
import { X, AlertTriangle, MessageSquare, User } from 'lucide-react'
import { useMemo } from 'react'

export default function AliasConflictModal({ entry }: { entry: AuthorizationEntry }) {
  const conflictModalEntryId = useStore((s) => s.conflictModalEntryId)
  const setConflictModalEntryId = useStore((s) => s.setConflictModalEntryId)
  const screenshots = useStore((s) => s.screenshots)
  const entries = useStore((s) => s.entries)
  const getAliasConflicts = useStore((s) => s.getAliasConflicts)

  const conflicts = useMemo(() => getAliasConflicts().filter((c) => c.entryIds.includes(entry.id)), [getAliasConflicts, entry.id])
  const conflictingEntries = useMemo(() =>
    conflicts.flatMap((c) =>
      c.entryIds.filter((id) => id !== entry.id).map((id) => entries.find((e) => e.id === id))
    ).filter(Boolean) as AuthorizationEntry[],
    [conflicts, entries, entry.id]
  )

  if (conflictModalEntryId !== entry.id) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inkstone/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-sandstone/60 px-5 py-4 flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold text-inkstone flex items-center gap-2">
            <AlertTriangle size={16} className="text-ochre" />
            别名冲突溯源
          </h3>
          <button
            onClick={() => setConflictModalEntryId(null)}
            className="p-1 hover:bg-sandstone/40 rounded transition-colors"
          >
            <X size={18} className="text-driftwood" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-ochre/8 border border-ochre/20 rounded-lg p-3">
            <p className="text-sm text-inkstone">
              <span className="font-semibold">{entry.songName}</span> 的别名与以下条目存在冲突：
            </p>
            {conflictingEntries.map((ce) => (
              <p key={ce.id} className="text-sm text-driftwood mt-1 pl-4">
                → <span className="font-medium text-inkstone">{ce.songName}</span>（分账 {ce.revenueShareRatio}%）
              </p>
            ))}
          </div>

          {conflicts.map((conflict) => (
            <div key={conflict.alias} className="space-y-3">
              <h4 className="text-sm font-medium text-driftwood flex items-center gap-1.5">
                <MessageSquare size={14} />
                冲突别名「{conflict.alias}」的排练群截图溯源
              </h4>

              {conflict.sources.map((source) => {
                const ss = screenshots.find((s) => s.id === source.screenshotId)
                if (!ss) return null
                return (
                  <div
                    key={source.screenshotId}
                    className="bg-parchment/60 border border-sandstone/40 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-driftwood mb-2">
                      <User size={12} />
                      <span className="font-medium">{ss.speaker}</span>
                      <span>·</span>
                      <span>{ss.sourceGroup}</span>
                      <span>·</span>
                      <span>{new Date(ss.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="bg-white rounded p-2.5 text-sm text-inkstone/80 leading-relaxed border border-sandstone/30">
                      <p className="italic">"{ss.rawText}"</p>
                    </div>
                    <p className="mt-2 text-xs text-amber flex items-center gap-1">
                      <AlertTriangle size={10} />
                      原始措辞中提到的「{conflict.alias}」与当前条目关联方式存在歧义
                    </p>
                  </div>
                )
              })}
            </div>
          ))}

          {conflicts.length === 0 && entry.status === 'conflict' && (
            <div className="text-sm text-driftwood italic">
              该条目状态为冲突，但未找到自动匹配的别名冲突记录。可能需要人工核对排练群截图。
            </div>
          )}
        </div>

        <div className="border-t border-sandstone/60 px-5 py-3 flex justify-end">
          <button
            onClick={() => setConflictModalEntryId(null)}
            className="px-4 py-1.5 bg-inkstone text-parchment text-sm rounded hover:bg-moss transition-colors"
          >
            了解了
          </button>
        </div>
      </div>
    </div>
  )
}
