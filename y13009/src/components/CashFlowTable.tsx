import { useMemo, useState } from 'react'
import { CheckCircle, XCircle, Search, Filter, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import NoteEditor from '@/components/NoteEditor'
import { useStore } from '@/store/useStore'
import type { CashFlowRecord } from '@/types'

type FilterKey = 'all' | 'pending' | 'confirmed' | 'withdrawn' | 'reversal'

export default function CashFlowTable() {
  const records = useStore(s => s.records)
  const confirmRecord = useStore(s => s.confirmRecord)
  const withdrawRecord = useStore(s => s.withdrawRecord)
  const updateNote = useStore(s => s.updateNote)

  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let list = [...records].sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    if (filter !== 'all') {
      if (filter === 'reversal') list = list.filter(r => r.isReversal)
      else list = list.filter(r => r.baseStatus === filter)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(r =>
        r.batchNo.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q),
      )
    }
    return list
  }, [records, filter, query])

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待确认' },
    { key: 'confirmed', label: '已确认' },
    { key: 'withdrawn', label: '已撤回' },
    { key: 'reversal', label: '冲正' },
  ]

  return (
    <div className="bg-white rounded shadow-sm border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <h3 className="font-serif text-base font-semibold text-ink-800">现金流记录</h3>
        <div className="flex items-center gap-1 ml-auto">
          <Filter size={14} className="text-slate-400" />
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                filter === f.key
                  ? 'bg-ink-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索批次/来源/备注..."
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-ink-700/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-medium">批次号</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">来源</th>
              <th className="text-left px-4 py-3 font-medium">导入时间</th>
              <th className="text-left px-4 py-3 font-medium">备注</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  暂无记录，点击右上角「导入审批邮件」开始
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <Row
                  key={r.id}
                  record={r}
                  zebra={i % 2 === 0}
                  onConfirm={() => confirmRecord(r.id)}
                  onWithdraw={() => withdrawRecord(r.id)}
                  onNote={v => updateNote(r.id, v)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({
  record,
  zebra,
  onConfirm,
  onWithdraw,
  onNote,
}: {
  record: CashFlowRecord
  zebra: boolean
  onConfirm: () => void
  onWithdraw: () => void
  onNote: (v: string) => void
}) {
  const isReversal = record.isReversal
  return (
    <tr
      className={`${zebra ? 'bg-white' : 'bg-slate-50/50'} ${isReversal ? 'bg-danger/5' : ''} hover:bg-ink-800/5 transition-colors`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {isReversal && <AlertTriangle size={14} className="text-danger" />}
          <span className="font-mono text-ink-900">{record.batchNo}</span>
          <span className="text-[10px] text-slate-400 font-mono">v{record.version}</span>
        </div>
      </td>
      <td className={`px-4 py-3 text-right font-mono ${record.amount < 0 ? 'text-danger font-semibold' : 'text-ink-900'}`}>
        {record.amount < 0 ? '-' : ''}¥{Math.abs(record.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3">
        <StatusBadge record={record} />
      </td>
      <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={record.source}>
        {record.source}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
        {record.importedAt.slice(0, 16).replace('T', ' ')}
      </td>
      <td className="px-4 py-3 w-48">
        <NoteEditor value={record.note} onSave={onNote} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {record.baseStatus === 'pending' && (
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded text-success border border-success/40 hover:bg-success/10 transition-colors"
          >
            <CheckCircle size={12} />
            确认
          </button>
        )}
        {record.baseStatus === 'confirmed' && (
          <button
            onClick={onWithdraw}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded text-muted border border-muted/40 hover:bg-muted/10 transition-colors"
          >
            <XCircle size={12} />
            撤回
          </button>
        )}
        {record.baseStatus === 'withdrawn' && (
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded text-warn border border-warn/40 hover:bg-warn/10 transition-colors"
          >
            <CheckCircle size={12} />
            重新确认
          </button>
        )}
      </td>
    </tr>
  )
}
