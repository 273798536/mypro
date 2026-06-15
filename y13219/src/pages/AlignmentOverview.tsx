import { useStore } from '@/store/useStore'
import EntryCard from '@/components/EntryCard'
import OverridePanel from '@/components/OverridePanel'
import VersionTimeline from '@/components/VersionTimeline'
import DeliverySummary from '@/components/DeliverySummary'
import { RefreshCw, ClipboardList, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function AlignmentOverview() {
  const entries = useStore((s) => s.entries)
  const getAliasConflicts = useStore((s) => s.getAliasConflicts)
  const rescan = useStore((s) => s.rescan)
  const setDeliverySummaryOpen = useStore((s) => s.setDeliverySummaryOpen)
  const screenshots = useStore((s) => s.screenshots)

  const [rescanLabel, setRescanLabel] = useState('')
  const [showRescan, setShowRescan] = useState(false)

  const conflicts = getAliasConflicts()
  const aligned = entries.filter((e) => e.status === 'aligned').length
  const overridden = entries.filter((e) => e.status === 'overridden').length

  const handleRescan = () => {
    rescan(rescanLabel || `重扫 ${new Date().toLocaleDateString('zh-CN')}`)
    setRescanLabel('')
    setShowRescan(false)
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-inkstone">版权授权分账对齐</h2>
        <p className="text-sm text-driftwood mt-1">
          已录入 {entries.length} 条授权条目 · {screenshots.length} 张排练群截图 · {aligned} 条已对齐
        </p>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-5 bg-ochre/8 border border-ochre/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-ochre shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ochre">发现 {conflicts.length} 个别名冲突</p>
            <p className="text-xs text-driftwood mt-0.5">
              {conflicts.map((c) => `「${c.alias}」`).join('、')}
              —点击条目卡片中的别名标签可查看排练群截图溯源
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <OverridePanel />

          <div className="bg-white rounded-lg border border-sandstone/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-inkstone">操作</h3>

            <button
              onClick={() => setDeliverySummaryOpen(true)}
              className="w-full py-2.5 text-sm bg-inkstone text-parchment rounded font-medium hover:bg-moss transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardList size={14} />
              生成交付摘要
            </button>

            <div>
              <button
                onClick={() => setShowRescan(!showRescan)}
                className="w-full py-2.5 text-sm border border-inkstone/20 text-inkstone rounded font-medium hover:bg-sandstone/40 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                重扫对齐
              </button>

              {showRescan && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={rescanLabel}
                    onChange={(e) => setRescanLabel(e.target.value)}
                    placeholder="版本说明（可选）"
                    className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
                  />
                  <button
                    onClick={handleRescan}
                    className="w-full py-2 text-sm bg-moss text-white rounded font-medium hover:bg-inkstone transition-colors"
                  >
                    确认重扫（生成新版本快照）
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-sandstone/60 p-4">
            <h3 className="text-sm font-semibold text-inkstone mb-2">当前状态摘要</h3>
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-xs">
                  <span className="text-inkstone truncate max-w-[140px]">{entry.songName}</span>
                  <span className={
                    entry.status === 'aligned' ? 'text-sage' :
                    entry.status === 'conflict' ? 'text-ochre' :
                    entry.status === 'overridden' ? 'text-amber' :
                    'text-driftwood'
                  }>
                    {entry.status === 'aligned' ? '已对齐' :
                     entry.status === 'conflict' ? '冲突' :
                     entry.status === 'overridden' ? '已改判' :
                     '缺期限'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-sandstone/40 text-xs text-driftwood">
              {overridden} 条改判记录永久保留
            </div>
          </div>
        </div>
      </div>

      <VersionTimeline />
      <DeliverySummary />
    </div>
  )
}
