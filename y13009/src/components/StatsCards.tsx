import { useMemo } from 'react'
import { CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface Card {
  label: string
  count: number
  icon: React.ReactNode
  color: string
  bar: string
}

export default function StatsCards() {
  const records = useStore(s => s.records)

  const stats = useMemo(() => {
    const total = records.length
    const confirmed = records.filter(r => r.baseStatus === 'confirmed').length
    const pending = records.filter(r => r.baseStatus === 'pending').length
    const reversals = records.filter(r => r.isReversal).length
    const net = records
      .filter(r => r.baseStatus !== 'withdrawn')
      .reduce((s, r) => s + r.amount, 0)
    return { total, confirmed, pending, reversals, net }
  }, [records])

  const cards: Card[] = [
    { label: '记录总数', count: stats.total, icon: <TrendingUp size={18} />, color: 'text-ink-800', bar: 'bg-ink-800' },
    { label: '已确认', count: stats.confirmed, icon: <CheckCircle size={18} />, color: 'text-success', bar: 'bg-success' },
    { label: '待确认', count: stats.pending, icon: <Clock size={18} />, color: 'text-warn', bar: 'bg-warn' },
    { label: '负数冲正', count: stats.reversals, icon: <AlertTriangle size={18} />, color: 'text-danger', bar: 'bg-danger' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-white rounded shadow-sm border border-slate-200 p-4 relative overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{c.label}</span>
            <span className={c.color}>{c.icon}</span>
          </div>
          <div className={`mt-2 text-3xl font-serif font-bold ${c.color}`}>{c.count}</div>
          {c.label === '记录总数' && (
            <div className="mt-1 text-xs text-slate-500">
              有效净额 <span className="font-semibold text-ink-800">¥{stats.net.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {c.label !== '记录总数' && stats.total > 0 && (
            <div className="mt-1 text-xs text-slate-400">占比 {((c.count / stats.total) * 100).toFixed(1)}%</div>
          )}
        </div>
      ))}
      <div className="bg-white rounded shadow-sm border border-slate-200 p-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">已撤回</span>
          <XCircle size={18} className="text-muted" />
        </div>
        <div className="mt-2 text-3xl font-serif font-bold text-muted">
          {records.filter(r => r.baseStatus === 'withdrawn').length}
        </div>
      </div>
    </div>
  )
}
