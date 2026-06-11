import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, History, Eye, User } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { fetchRecordDetail } from '@/utils/api'

const actionLabels: Record<string, string> = {
  create: '创建记录',
  judge: '初次判断',
  rejudge: '重审判断',
  annotate: '添加标注',
  status_change: '状态变更',
}

const roleBadgeClass: Record<string, string> = {
  inspector: 'bg-museum-orange/20 text-museum-orange',
  teacher: 'bg-museum-amber/20 text-museum-amber',
  handover: 'bg-museum-green/20 text-museum-green',
}

export default function RecordHistory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recordDetail, setRecordDetail } = useStore()

  useEffect(() => {
    if (!id) return
    fetchRecordDetail(id).then(setRecordDetail).catch(() => setRecordDetail(null))
    return () => setRecordDetail(null)
  }, [id, setRecordDetail])

  if (!recordDetail) {
    return (
      <div className="flex items-center justify-center h-full text-museum-textDim">
        加载中...
      </div>
    )
  }

  const { record, history } = recordDetail

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/records/${id}`)}
          className="p-2 rounded-lg bg-museum-card border border-museum-border text-museum-textMuted hover:text-museum-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-medium text-museum-text">{record.cabinetNo} - 变更历史</h2>
          <p className="text-xs text-museum-textDim">{record.floor} · {record.unit}</p>
        </div>
        <button
          onClick={() => navigate(`/records/${id}`)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-museum-card border border-museum-border text-sm text-museum-textMuted hover:text-museum-text transition-colors"
        >
          <Eye size={14} />
          查看原始照片
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-museum-textDim">暂无历史记录</div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-museum-border" />

          <div className="space-y-6">
            {history.map((entry) => (
              <div key={entry.id} className="relative pl-14">
                <div className={`absolute left-3.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                  entry.action === 'rejudge'
                    ? 'border-museum-amber bg-museum-amber/30'
                    : 'border-museum-border bg-museum-card'
                }`} />

                <div className="bg-museum-card border border-museum-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      entry.action === 'rejudge'
                        ? 'bg-museum-amber/15 text-museum-amber'
                        : 'bg-museum-surface text-museum-textMuted'
                    }`}>
                      {actionLabels[entry.action] || entry.action}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${roleBadgeClass[entry.operatorRole] || 'bg-museum-surface text-museum-textDim'}`}>
                      {entry.operatorRole}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 text-xs text-museum-textDim">
                    <User size={12} />
                    <span>{entry.operatorName}</span>
                    <span>·</span>
                    <span>{new Date(entry.timestamp).toLocaleString('zh-CN')}</span>
                  </div>

                  {(entry.oldValue || entry.newValue) && (
                    <div className="text-xs mb-2">
                      <span className="text-museum-red line-through">{entry.oldValue}</span>
                      <span className="mx-2 text-museum-textDim">→</span>
                      <span className="text-museum-green">{entry.newValue}</span>
                    </div>
                  )}

                  {entry.reason && (
                    <div className="text-xs text-museum-textMuted mt-1">
                      原因: {entry.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
