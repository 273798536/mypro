import { useStore } from '@/store'
import { History, MessageSquare, ImagePlus, Shield, X, Clock } from 'lucide-react'

function triggerLabel(t: string) {
  const map: Record<string, string> = {
    remark_added: '添加备注',
    screenshot_added: '添加截图',
    rescan: '重扫描',
    manual_override: '人工确认',
  }
  return map[t] || t
}

function triggerIcon(t: string) {
  const map: Record<string, typeof MessageSquare> = {
    remark_added: MessageSquare,
    screenshot_added: ImagePlus,
    rescan: History,
    manual_override: Shield,
  }
  return map[t] || Clock
}

function triggerCls(t: string) {
  const map: Record<string, string> = {
    remark_added: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    screenshot_added: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    rescan: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    manual_override: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  }
  return map[t] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'
}

export default function HistoryDrawer() {
  const { entries, history, activeEntryId, historyDrawerOpen, setHistoryDrawerOpen } = useStore()

  const entryHistory = activeEntryId
    ? history
        .filter((h) => h.entryId === activeEntryId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const activeEntry = entries.find((e) => e.id === activeEntryId)

  if (!historyDrawerOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setHistoryDrawerOpen(false)}
      />
      <div className="relative w-[420px] max-w-full bg-[#12122a] border-l border-[#2a2a4a] flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a4a]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-gray-200">版本历史</span>
            {activeEntry && (
              <span className="text-xs text-gray-500 ml-1">— {activeEntry.projectName}</span>
            )}
          </div>
          <button
            onClick={() => setHistoryDrawerOpen(false)}
            className="p-1 rounded hover:bg-[#2a2a4a] text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!activeEntryId ? (
            <div className="text-center text-gray-500 text-sm py-8">
              选择条目后查看其版本历史
            </div>
          ) : entryHistory.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              暂无历史记录
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-[#2a2a4a]" />

              {entryHistory.map((h, idx) => {
                const Icon = triggerIcon(h.trigger)
                const cls = triggerCls(h.trigger)
                return (
                  <div key={h.id} className="relative pb-6 last:pb-0">
                    <div className={`absolute -left-[13px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center ${cls}`}>
                      <Icon size={12} />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${cls}`}>
                          {triggerLabel(h.trigger)}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono">
                          {new Date(h.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      <div className="bg-[#0d0d1a] rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">对齐状态:</span>
                          <span
                            className={
                              h.snapshot.alignmentStatus === 'aligned'
                                ? 'text-emerald-400'
                                : h.snapshot.alignmentStatus === 'misaligned'
                                ? 'text-red-400'
                                : 'text-gray-400'
                            }
                          >
                            {h.snapshot.alignmentStatus === 'aligned'
                              ? '已对齐'
                              : h.snapshot.alignmentStatus === 'misaligned'
                              ? '异常'
                              : '待定'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">授权状态:</span>
                          <span
                            className={
                              h.snapshot.authorization.status === 'valid'
                                ? 'text-emerald-400'
                                : h.snapshot.authorization.status === 'expired'
                                ? 'text-red-400'
                                : h.snapshot.authorization.status === 'expiring'
                                ? 'text-yellow-400'
                                : 'text-orange-400'
                            }
                          >
                            {h.snapshot.authorization.status === 'valid'
                              ? '有效'
                              : h.snapshot.authorization.status === 'expired'
                              ? '已过期'
                              : h.snapshot.authorization.status === 'expiring'
                              ? '临期'
                              : '需确认'}
                          </span>
                        </div>

                        {h.snapshot.remarks.length > 0 && (
                          <div>
                            <span className="text-gray-500">备注 ({h.snapshot.remarks.length}):</span>
                            <div className="mt-1 space-y-0.5">
                              {h.snapshot.remarks.map((r) => (
                                <div key={r.id} className="text-gray-400 pl-2">
                                  <span className="text-gray-600">v{r.version}</span>{' '}
                                  {r.content.length > 40 ? r.content.slice(0, 40) + '…' : r.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {h.snapshot.screenshots.length > 0 && (
                          <div>
                            <span className="text-gray-500">截图 ({h.snapshot.screenshots.length}):</span>
                            <div className="mt-1 space-y-0.5">
                              {h.snapshot.screenshots.map((s) => (
                                <div key={s.id} className="text-gray-400 pl-2">
                                  <span className="text-gray-600">v{s.version}</span>{' '}
                                  {s.fileName}
                                  {s.isSupplementary && (
                                    <span className="text-amber-500 ml-1">补</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {h.snapshot.authorization.confirmReason && (
                          <div className="flex items-start gap-1">
                            <span className="text-gray-500 shrink-0">确认原因:</span>
                            <span className="text-orange-400">{h.snapshot.authorization.confirmReason}</span>
                          </div>
                        )}
                        {h.snapshot.authorization.nextStep && (
                          <div className="flex items-start gap-1">
                            <span className="text-gray-500 shrink-0">下一步:</span>
                            <span className="text-amber-400">{h.snapshot.authorization.nextStep}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
