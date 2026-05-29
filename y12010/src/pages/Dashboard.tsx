import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Clock, AlertTriangle, AlertOctagon, TrendingUp, ArrowUpRight } from 'lucide-react'
import { api } from '@/utils/api'

interface Stats {
  totalLocked: number
  pendingRelease: number
  delayedReleaseCount: number
  overdueCount: number
}

interface Alert {
  id: string
  type: string
  message: string
  entityType: string
  entityId: string
  timestamp: string
}

interface Batch {
  id: string
  name: string
  status: 'active' | 'closed' | 'settling'
  totalLocked: number
  totalReleased: number
  pendingRelease: number
  delayedAmount: number
}

interface MarginRecord {
  id: string
  enterpriseName: string
  batchName: string
  amount: number
  status: 'locked' | 'pending_release' | 'released' | 'delayed_release'
  lockTime: string
  source: string
}

const statusLabel: Record<string, string> = {
  locked: '已锁定',
  pending_release: '待释放',
  released: '已释放',
  delayed_release: '延迟释放',
}

const statusBadge: Record<string, string> = {
  locked: 'badge badge-locked',
  pending_release: 'badge badge-pending',
  released: 'badge badge-released',
  delayed_release: 'badge badge-delayed',
}

const batchStatusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: '进行中', cls: 'bg-emerald-50 text-emerald-700' },
  closed: { label: '已关闭', cls: 'bg-slate-100 text-slate-600' },
  settling: { label: '结算中', cls: 'bg-amber-50 text-amber-700' },
}

const alertTypeIcon: Record<string, typeof AlertTriangle> = {
  overdue: AlertOctagon,
  delayed: AlertTriangle,
  warning: AlertTriangle,
  info: Clock,
}

function formatAmount(v: number | null | undefined) {
  if (v === null || v === undefined) return '0.00'
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className ?? ''}`} />
}

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl p-5 bg-white border border-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-32 mb-1" />
    </div>
  )
}

function BatchRowSkeleton() {
  return (
    <div className="p-4 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full rounded-full mb-2" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

function AlertRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-slate-100 last:border-b-0">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
        </tr>
      ))}
    </>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [records, setRecords] = useState<MarginRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.dashboard.stats(),
      api.dashboard.alerts(),
      api.dashboard.batchProgress(),
      api.margin.list(),
    ]).then(([s, a, b, r]) => {
      setStats(s)
      setAlerts(Array.isArray(a) ? a : (a?.alerts ?? []))
      setBatches(Array.isArray(b) ? b : (b?.batches ?? []))
      setRecords((Array.isArray(r) ? r : []).slice(0, 5))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const metricCards = stats
    ? [
        {
          label: '已锁定保证金总额',
          value: `¥${formatAmount(stats.totalLocked)}`,
          icon: Lock,
          gradient: 'from-teal-700 to-teal-500',
          iconBg: 'bg-white/20',
          textColor: 'text-white',
        },
        {
          label: '待释放金额',
          value: `¥${formatAmount(stats.pendingRelease)}`,
          icon: Clock,
          gradient: 'from-blue-600 to-blue-400',
          iconBg: 'bg-white/20',
          textColor: 'text-white',
        },
        {
          label: '撤单延迟释放数',
          value: stats.delayedReleaseCount,
          icon: AlertTriangle,
          gradient: 'from-amber-600 to-amber-400',
          iconBg: 'bg-white/20',
          textColor: 'text-white',
        },
        {
          label: '履约逾期数',
          value: stats.overdueCount,
          icon: AlertOctagon,
          gradient: 'from-red-600 to-red-400',
          iconBg: 'bg-white/20',
          textColor: 'text-white',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">总览仪表盘</h1>
          <p className="text-sm text-slate-400 mt-0.5">碳配额交易保证金管理系统</p>
        </div>
        <button
          onClick={() => navigate('/margin')}
          className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 font-medium transition-colors"
        >
          保证金管理
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metricCards.map((card) => (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${card.gradient} shadow-sm hover:shadow-md transition-shadow duration-200`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.iconBg}`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`${card.textColor} text-sm font-medium opacity-90`}>{card.label}</span>
                </div>
                <div className={`font-mono-data text-2xl font-bold ${card.textColor}`}>{card.value}</div>
                <TrendingUp className={`absolute right-4 bottom-4 w-12 h-12 ${card.textColor} opacity-10`} />
              </div>
            ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-display font-semibold text-slate-800">批次进度</h2>
            <span className="text-xs text-slate-400">{batches.length} 个批次</span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <BatchRowSkeleton key={i} />)
              : batches.map((batch) => {
                  const total = batch.totalLocked + batch.totalReleased + batch.pendingRelease + batch.delayedAmount
                  const cfg = batchStatusConfig[batch.status] ?? batchStatusConfig.active
                  return (
                    <div key={batch.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">{batch.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-2">
                        {batch.totalLocked > 0 && (
                          <div
                            className="bg-teal-500 transition-all"
                            style={{ width: total > 0 ? `${(batch.totalLocked / total) * 100}%` : '0%' }}
                          />
                        )}
                        {batch.totalReleased > 0 && (
                          <div
                            className="bg-emerald-400 transition-all"
                            style={{ width: total > 0 ? `${(batch.totalReleased / total) * 100}%` : '0%' }}
                          />
                        )}
                        {batch.pendingRelease > 0 && (
                          <div
                            className="bg-amber-400 transition-all"
                            style={{ width: total > 0 ? `${(batch.pendingRelease / total) * 100}%` : '0%' }}
                          />
                        )}
                        {batch.delayedAmount > 0 && (
                          <div
                            className="bg-orange-400 transition-all"
                            style={{ width: total > 0 ? `${(batch.delayedAmount / total) * 100}%` : '0%' }}
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>已锁定 <em className="font-mono-data not-italic text-teal-600">{formatAmount(batch.totalLocked)}</em></span>
                        <span>已释放 <em className="font-mono-data not-italic text-emerald-600">{formatAmount(batch.totalReleased)}</em></span>
                        <span>待释放 <em className="font-mono-data not-italic text-amber-600">{formatAmount(batch.pendingRelease)}</em></span>
                        <span>延迟释放 <em className="font-mono-data not-italic text-orange-600">{formatAmount(batch.delayedAmount)}</em></span>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>

        <div className="col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <h2 className="font-display font-semibold text-slate-800">异常预警</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <AlertRowSkeleton key={i} />)
              : alerts.map((alert) => {
                  const Icon = alertTypeIcon[alert.type] ?? AlertTriangle
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        if (alert.entityType === 'order') navigate(`/orders?id=${alert.entityId}`)
                        else if (alert.entityType === 'margin') navigate(`/margin?id=${alert.entityId}`)
                      }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug truncate">{alert.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(alert.timestamp).toLocaleString('zh-CN')}</p>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">最近保证金流水</h2>
          <button
            onClick={() => navigate('/margin')}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            查看全部
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">企业名称</th>
                <th className="px-5 py-3 font-medium">批次</th>
                <th className="px-5 py-3 font-medium">金额</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">锁定时间</th>
                <th className="px-5 py-3 font-medium">来源</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton />
              ) : records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-700">{r.enterpriseName}</td>
                  <td className="px-5 py-3 text-slate-600">{r.batchName}</td>
                  <td className="px-5 py-3 font-mono-data text-slate-800">¥{formatAmount(r.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={statusBadge[r.status] ?? 'badge'}>{statusLabel[r.status] ?? r.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(r.lockTime).toLocaleString('zh-CN')}</td>
                  <td className="px-5 py-3 text-slate-500">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
