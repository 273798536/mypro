import { AlertTriangle, Download, Shield, ShieldOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useReviewStore } from '../store'

export default function AnomalyExportPanel() {
  const anomalyRecords = useReviewStore((s) => s.anomalyRecords)
  const notes = useReviewStore((s) => s.notes)
  const exportStatus = useReviewStore((s) => s.exportStatus)
  const exportSummary = useReviewStore((s) => s.exportSummary)
  const setShowAuthModal = useReviewStore((s) => s.setShowAuthModal)
  const reviewItems = useReviewStore((s) => s.reviewItems)

  const unalignedItems = reviewItems.filter(
    (i) => !i.alignedWith.files || !i.alignedWith.trackList || !i.alignedWith.finalChecklist
  )

  const exportStatusConfig = {
    idle: { icon: Download, label: '导出摘要', color: 'bg-amber hover:bg-amberDark text-base' },
    checking: { icon: Loader2, label: '校验中…', color: 'bg-mist/30 text-mist' },
    consistent: { icon: CheckCircle2, label: '一致', color: 'bg-sage/30 text-sage' },
    inconsistent: { icon: XCircle, label: '不一致', color: 'bg-coral/30 text-coral' },
    exported: { icon: CheckCircle2, label: '已导出', color: 'bg-sage/30 text-sage' },
  }

  const esc = exportStatusConfig[exportStatus]
  const ExportIcon = esc.icon

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-l border-white/5 bg-surface/40">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <AlertTriangle size={16} className="text-coral" />
        <h2 className="font-serif text-sm font-semibold tracking-wide">异常区</h2>
        {anomalyRecords.length > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-xs font-bold text-white">
            {anomalyRecords.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {anomalyRecords.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-ivoryMuted">
            <Shield size={32} className="mb-2 opacity-20" />
            <p className="text-xs">暂无异常记录</p>
            <p className="mt-1 text-xs opacity-60">人工批注覆盖旧判断时会自动记录于此</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mb-2 rounded bg-coral/10 px-2 py-1.5 text-xs text-coral">
              以下记录为人工批注覆盖旧判断，不混入正常复核结果
            </div>
            {anomalyRecords.map((record) => {
              const note = notes.find((n) => n.id === record.noteId)
              return (
                <div
                  key={record.id}
                  className="rounded-lg border border-coral/20 bg-coral/5 p-3"
                >
                  <div className="flex items-center gap-1 text-xs font-medium text-coral">
                    <AlertTriangle size={12} />
                    覆盖记录
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-ivoryMuted line-through">{record.originalValue}</span>
                      <span className="text-ivoryMuted">→</span>
                      <span className="font-medium text-ivory">{record.overrideValue}</span>
                    </div>
                    <div className="text-ivoryMuted">
                      操作人：{record.operator}
                    </div>
                    <div className="text-ivoryMuted">
                      {new Date(record.occurredAt).toLocaleString('zh-CN')}
                    </div>
                    {note && (
                      <div className="mt-1 rounded bg-white/5 px-2 py-1 text-ivoryMuted">
                        {note.content}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {unalignedItems.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-amber">
              <ShieldOff size={12} />
              未对齐条目
            </div>
            <div className="space-y-1.5">
              {unalignedItems.map((item) => (
                <div key={item.id} className="rounded border border-amber/20 bg-amber/5 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ivory">{item.songNumber}</span>
                    <span className="text-ivoryMuted">{item.versionNumber}</span>
                  </div>
                  <div className="mt-1 flex gap-2 text-ivoryMuted">
                    <span className={item.alignedWith.files ? 'text-sage' : 'text-coral'}>文件</span>
                    <span className={item.alignedWith.trackList ? 'text-sage' : 'text-coral'}>曲目表</span>
                    <span className={item.alignedWith.finalChecklist ? 'text-sage' : 'text-coral'}>清单</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 px-4 py-3">
        <button
          onClick={() => setShowAuthModal(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-medium text-amber transition-colors hover:bg-amber/20"
        >
          <Shield size={14} />
          添加授权备注（触发对齐）
        </button>

        <button
          onClick={exportSummary}
          disabled={exportStatus === 'checking'}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${esc.color}`}
        >
          <ExportIcon size={14} className={exportStatus === 'checking' ? 'animate-spin' : ''} />
          {esc.label}
        </button>

        {exportStatus === 'inconsistent' && (
          <div className="mt-2 rounded bg-coral/10 px-2 py-1.5 text-xs text-coral">
            页面状态与导出内容不一致，请先添加授权备注对齐
          </div>
        )}

        {exportStatus === 'exported' && (
          <div className="mt-2 rounded bg-sage/10 px-2 py-1.5 text-xs text-sage">
            导出成功，页面状态与文件内容一致
          </div>
        )}
      </div>
    </div>
  )
}
