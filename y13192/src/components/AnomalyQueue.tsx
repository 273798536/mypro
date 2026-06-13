import { useState } from 'react'
import { CheckCircle, FileQuestion, UserCheck, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { AnomalyStatus, AnomalyRecord } from '@/types'

const columns: { key: AnomalyStatus; label: string; accent: string; icon: typeof CheckCircle }[] = [
  { key: 'processed', label: '已处理', accent: 'border-green-500/40 text-green-400', icon: CheckCircle },
  { key: 'pending_material', label: '待补材料', accent: 'border-amber-500/40 text-amber-400', icon: FileQuestion },
  { key: 'manual_override', label: '人工改判', accent: 'border-purple-500/40 text-purple-400', icon: UserCheck },
]

const statusOptions: { value: AnomalyStatus; label: string }[] = [
  { value: 'processed', label: '已处理' },
  { value: 'pending_material', label: '待补材料' },
  { value: 'manual_override', label: '人工改判' },
]

function AnomalyCard({ record, onMove }: { record: AnomalyRecord; onMove: (id: string, status: AnomalyStatus) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="rounded-lg border border-gray-700/50 p-3 cursor-pointer transition-colors hover:border-amber-500/30"
      style={{ background: '#16213e' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-200">{record.cellId}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-amber-400 mb-1">{record.anomalyType}</p>
      {record.note && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{record.note}</p>}
      {record.handler && <p className="text-xs text-gray-500">处理人: {record.handler}</p>}

      {menuOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-700/50 pt-2">
          {statusOptions.filter((o) => o.value !== record.status).map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); onMove(record.id, opt.value); setMenuOpen(false) }}
              className="rounded px-2 py-1 text-xs bg-gray-700/60 text-gray-300 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
            >
              → {opt.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? '收起' : '展开详情'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 border-t border-gray-700/50 pt-2 text-xs text-gray-400">
          <p>ID: {record.id}</p>
          <p>状态: {statusOptions.find((o) => o.value === record.status)?.label}</p>
          {record.handledAt && <p>处理时间: {new Date(record.handledAt).toLocaleString()}</p>}
          {record.note && <p className="whitespace-pre-wrap">备注: {record.note}</p>}
        </div>
      )}
    </div>
  )
}

export default function AnomalyQueue() {
  const { anomalies, updateAnomalyStatus } = useStore()

  const handleMove = (id: string, status: AnomalyStatus) => {
    const handler = prompt('请输入处理人姓名') ?? ''
    if (!handler) return
    updateAnomalyStatus(id, status, handler)
  }

  return (
    <div className="p-4" style={{ background: '#1a1a2e' }}>
      <h2 className="text-lg font-semibold text-amber-400 mb-4">异常队列</h2>
      <div className="grid grid-cols-3 gap-4">
        {columns.map(({ key, label, accent, icon: Icon }) => {
          const items = anomalies.filter((a) => a.status === key)
          return (
            <div key={key} className={`rounded-xl border ${accent.split(' ')[0]} p-3`} style={{ background: '#16213e' }}>
              <div className={`flex items-center gap-2 mb-3 ${accent.split(' ').slice(1).join(' ')}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{label}</span>
                <span className="ml-auto rounded-full bg-gray-700/60 px-2 py-0.5 text-xs text-gray-300">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <AnomalyCard key={a.id} record={a} onMove={handleMove} />
                ))}
                {items.length === 0 && <p className="text-xs text-gray-600 text-center py-4">暂无记录</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
