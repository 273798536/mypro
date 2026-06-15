import { useStore } from '@/store/useStore'
import { Edit3, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function OverridePanel() {
  const entries = useStore((s) => s.entries)
  const overrideEntry = useStore((s) => s.overrideEntry)
  const [selectedEntryId, setSelectedEntryId] = useState<string>('')
  const [fieldName, setFieldName] = useState<string>('revenueShareRatio')
  const [newValue, setNewValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [showForm, setShowForm] = useState(false)

  const selectedEntry = entries.find((e) => e.id === selectedEntryId)

  const handleSubmit = () => {
    if (!selectedEntryId || !newValue || !reason) return

    let oldValue = ''
    if (selectedEntry) {
      if (fieldName === 'revenueShareRatio') {
        oldValue = `${selectedEntry.revenueShareRatio}%`
      } else if (fieldName === 'authorizationPeriod') {
        oldValue = selectedEntry.authorizationPeriod
          ? `${selectedEntry.authorizationPeriod.start}~${selectedEntry.authorizationPeriod.end}`
          : '无'
      }
    }

    overrideEntry(selectedEntryId, fieldName, oldValue, newValue, reason, '小温')
    setSelectedEntryId('')
    setNewValue('')
    setReason('')
    setShowForm(false)
  }

  return (
    <div className="bg-white rounded-lg border border-sandstone/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-inkstone flex items-center gap-1.5">
          <Edit3 size={14} className="text-amber" />
          人工改判
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1 bg-amber/10 text-amber rounded hover:bg-amber/20 transition-colors"
        >
          {showForm ? '取消' : '新增改判'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 mb-4 pb-4 border-b border-sandstone/40">
          <div>
            <label className="text-xs text-driftwood block mb-1">选择条目</label>
            <select
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber/30"
            >
              <option value="">-- 请选择 --</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.songName}
                  {e.status === 'overridden' ? ' (已改判)' : ''}
                  {e.status === 'conflict' ? ' (冲突)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">改判字段</label>
            <select
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber/30"
            >
              <option value="revenueShareRatio">分账比例</option>
              <option value="authorizationPeriod">授权期限</option>
            </select>
          </div>

          {selectedEntry && (
            <div className="text-xs bg-parchment/60 rounded px-3 py-2">
              <span className="text-driftwood">当前值：</span>
              <span className="text-inkstone font-medium">
                {fieldName === 'revenueShareRatio'
                  ? `${selectedEntry.revenueShareRatio}%`
                  : selectedEntry.authorizationPeriod
                    ? `${selectedEntry.authorizationPeriod.start}~${selectedEntry.authorizationPeriod.end}`
                    : '无'}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs text-driftwood block mb-1">
              新值 {fieldName === 'revenueShareRatio' ? '（如 35）' : '（如 2025-01-01~2026-12-31）'}
            </label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber/30"
              placeholder={fieldName === 'revenueShareRatio' ? '输入新的分账比例' : '输入新的授权期限'}
            />
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">改判原因 *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber/30 resize-none"
              placeholder="说明为什么需要改判，引用排练群截图中的证据..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedEntryId || !newValue || !reason}
            className="w-full py-2 text-sm bg-amber text-white rounded font-medium hover:bg-amber/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认改判
          </button>

          <div className="flex items-start gap-1.5 text-xs text-ochre/80 bg-ochre/5 rounded px-2.5 py-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>改判记录将永久保留在历史中，不可删除，下一班值班人员可查看改判原因</span>
          </div>
        </div>
      )}

      <div className="text-xs text-driftwood">
        {entries.filter((e) => e.status === 'overridden').length} 条已改判 · 改判记录永久保留
      </div>
    </div>
  )
}
