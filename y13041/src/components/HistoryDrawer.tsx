import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { HistoryActionType, HistoryRecord } from '@/shared/types'
import { usePlaybackStore } from '@/store/playbackStore'

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  playbackId: string
}

const actionTypeLabels: Record<HistoryActionType, { label: string; className: string }> = {
  create: { label: '创建', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejudge: { label: '改判', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  add_note: { label: '追加备注', className: 'bg-green-50 text-green-700 border-green-200' },
  confirm: { label: '人工确认', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  run_batch: { label: '批次运行', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  generate_report: { label: '生成报告', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
}

const fieldLabels: Record<string, string> = {
  conclusion: '结论',
  conclusion_reason: '结论理由',
  conclusionReason: '结论理由',
  status: '状态',
  content: '内容',
  note: '备注',
  run_count: '跑批次数',
  runCount: '跑批次数',
  enterprise_name: '企业名称',
  batch_no: '批次号',
  markdown_report: 'Markdown报告',
}

function getFieldLabel(field: string): string {
  return fieldLabels[field] || field
}

function DiffDisplay({ oldValue, newValue }: { oldValue: string | null; newValue: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {oldValue !== null && (
        <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-red-600 line-through">
          {oldValue}
        </span>
      )}
      {oldValue !== null && newValue !== null && (
        <span className="text-slatefinance-400">→</span>
      )}
      {newValue !== null && (
        <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-green-700">
          {newValue}
        </span>
      )}
    </div>
  )
}

export default function HistoryDrawer({ isOpen, onClose, playbackId }: HistoryDrawerProps) {
  const history = usePlaybackStore((state) => state.history)
  const loadHistory = usePlaybackStore((state) => state.loadHistory)
  const loading = usePlaybackStore((state) => state.loading)

  useEffect(() => {
    if (isOpen && playbackId) {
      loadHistory(playbackId)
    }
  }, [isOpen, playbackId, loadHistory])

  const sortedHistory = [...(history ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute right-0 top-0 bottom-0 bg-white shadow-xl animate-slide-in-right flex flex-col"
        style={{ width: 420 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slatefinance-100">
          <h3 className="text-lg font-semibold text-slatefinance-800">变更历史</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slatefinance-400 hover:text-slatefinance-600 hover:bg-slatefinance-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slatefinance-400 text-sm">
              加载中...
            </div>
          ) : sortedHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slatefinance-400 text-sm">
              暂无变更历史
            </div>
          ) : (
            <div className="space-y-4">
              {sortedHistory.map((record: HistoryRecord) => {
                const actionConfig = actionTypeLabels[record.actionType]
                return (
                  <div
                    key={record.id}
                    className="rounded-lg border border-slatefinance-100 bg-slatefinance-50/50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${actionConfig.className}`}
                      >
                        {actionConfig.label}
                      </span>
                      <span className="text-sm font-medium text-slatefinance-700">
                        {record.operatorName}
                      </span>
                      <span className="text-xs text-slatefinance-400 ml-auto">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {record.fieldChanges && record.fieldChanges.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slatefinance-200">
                        {record.fieldChanges.map((change, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="text-xs text-slatefinance-500 w-16 flex-shrink-0 pt-1">
                              {getFieldLabel(change.field)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <DiffDisplay oldValue={change.oldValue} newValue={change.newValue} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
