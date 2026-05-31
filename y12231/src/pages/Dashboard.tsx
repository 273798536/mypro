import { useEffect, useState } from 'react'
import { Wallet, TrendingDown, Clock, AlertTriangle, RotateCcw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from '@/api'
import { useFilterStore } from '@/stores/filterStore'
import type { DashboardData } from '@/types'

const STATUS_COLORS: Record<string, string> = { active: '#0f766e', expired: '#d97706', exhausted: '#dc2626' }
const STATUS_LABELS: Record<string, string> = { active: '有效', expired: '已过期', exhausted: '已用尽' }
const TYPE_MAP: Record<string, { label: string; cls: string }> = {
  consumption: { label: '消费', cls: 'badge-danger' },
  recharge: { label: '充值', cls: 'badge-success' },
  refund: { label: '退款', cls: 'badge-info' },
}
const MEMBER_LABELS: Record<string, string> = { active: '活跃', frozen: '冻结', closed: '已关闭' }
const EXC_LABELS: Record<string, string> = { pending: '待处理', confirmed: '已确认', rejected: '已驳回', resolved: '已解决' }

function StatCard({ icon: Icon, label, value, color, bg, badge }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string; badge?: number
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>
            {value}
            {badge !== undefined && badge > 0 && <span className="ml-2 text-xs badge-danger">{badge}</span>}
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: bg }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    startDate, endDate, memberStatus, packageStatus, exceptionStatus,
    setStartDate, setEndDate, setMemberStatus, setPackageStatus, setExceptionStatus,
    resetFilters, getFilters,
  } = useFilterStore()

  useEffect(() => {
    setLoading(true)
    api.dashboard.getStats(getFilters()).then(res => {
      setData(res.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [startDate, endDate, memberStatus, packageStatus, exceptionStatus, getFilters])

  const subtitle = [
    (startDate || endDate) && `${startDate || '...'} 至 ${endDate || '...'}`,
    memberStatus && `会员: ${MEMBER_LABELS[memberStatus] || memberStatus}`,
    packageStatus && `套餐: ${STATUS_LABELS[packageStatus] || packageStatus}`,
    exceptionStatus && `异常: ${EXC_LABELS[exceptionStatus] || exceptionStatus}`,
  ].filter(Boolean).join(' | ')

  const barData = (data?.packageStats.byStatus ?? []).map(s => ({
    name: STATUS_LABELS[s.status] || s.status, count: s.count, status: s.status,
  }))
  const pieData = (data?.packageStats.byStatus ?? []).map(s => ({
    name: STATUS_LABELS[s.status] || s.status, value: s.total_price, status: s.status,
  }))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">会员预存总览</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">筛选：{subtitle}</p>}
      </div>

      <div className="filter-bar">
        <input type="date" className="filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-sm text-slate-400">至</span>
        <input type="date" className="filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <select className="filter-select" value={memberStatus} onChange={e => setMemberStatus(e.target.value)}>
          <option value="">全部会员</option>
          <option value="active">活跃</option>
          <option value="frozen">冻结</option>
          <option value="closed">已关闭</option>
        </select>
        <select className="filter-select" value={packageStatus} onChange={e => setPackageStatus(e.target.value)}>
          <option value="">全部套餐</option>
          <option value="active">有效</option>
          <option value="expired">已过期</option>
          <option value="exhausted">已用尽</option>
        </select>
        <select className="filter-select" value={exceptionStatus} onChange={e => setExceptionStatus(e.target.value)}>
          <option value="">全部异常</option>
          <option value="pending">待处理</option>
          <option value="confirmed">已确认</option>
          <option value="rejected">已驳回</option>
          <option value="resolved">已解决</option>
        </select>
        <button className="btn-secondary btn-sm flex items-center gap-1" onClick={resetFilters}>
          <RotateCcw className="w-3.5 h-3.5" /> 重置
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-8 bg-slate-200 rounded w-28" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard icon={Wallet} label="总预存余额" value={`¥${(data?.totalBalance ?? 0).toLocaleString()}`} color="#0f766e" bg="#ccfbf1" />
            <StatCard icon={TrendingDown} label="本月消费" value={`¥${(data?.monthlyConsumption ?? 0).toLocaleString()}`} color="#ea580c" bg="#ffedd5" />
            <StatCard icon={Clock} label="待确认条目" value={`${data?.pendingCount ?? 0} 条`} color="#f59e0b" bg="#fef3c7" badge={data?.pendingCount} />
            <StatCard icon={AlertTriangle} label="异常条目" value={`${data?.exceptionCount ?? 0} 条`} color="#ef4444" bg="#fee2e2" badge={data?.exceptionCount} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">套餐数量分布</h3>
          {loading ? (
            <div className="h-64 animate-pulse bg-slate-100 rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">套餐金额分布</h3>
          {loading ? (
            <div className="h-64 animate-pulse bg-slate-100 rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">最近交易</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-10 bg-slate-100 rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">时间</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">会员</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">宠物</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">类型</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">金额</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentTransactions ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">暂无数据</td></tr>
                ) : (data?.recentTransactions ?? []).map(t => {
                  const tm = TYPE_MAP[t.type] || { label: t.type, cls: 'badge-normal' }
                  return (
                    <tr key={t.id} className="border-b border-slate-50 table-row-hover">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{t.created_at.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-5 py-3">{t.member_name || '-'}</td>
                      <td className="px-5 py-3">{t.pet_name || '-'}</td>
                      <td className="px-5 py-3"><span className={tm.cls}>{tm.label}</span></td>
                      <td className="px-5 py-3 text-right font-medium" style={{ color: t.type === 'consumption' ? '#dc2626' : t.type === 'recharge' ? '#16a34a' : '#2563eb' }}>
                        {t.type === 'consumption' ? '-' : '+'}¥{t.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        {t.is_backfilled ? <span className="badge-info">补录</span> : <span className="badge-normal">正常</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
