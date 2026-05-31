import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Ticket, AlertTriangle, AlertCircle, TrendingUp, DollarSign } from 'lucide-react'

export function Dashboard() {
  const { dashboardStats, fetchDashboardStats, loading } = useStore()

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  const stats = dashboardStats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">工作台概览</h1>
        <p className="text-slate-500 mt-1">实时监控分账状态和异常情况</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="今日订单"
          value={stats?.todayOrders || 0}
          icon={<Ticket className="text-indigo-600" />}
          color="indigo"
          loading={loading}
        />
        <StatCard
          title="待确认项"
          value={stats?.pendingExceptions || 0}
          icon={<AlertTriangle className="text-amber-600" />}
          color="amber"
          loading={loading}
          badge="需要人工确认"
        />
        <StatCard
          title="异常项"
          value={stats?.errorExceptions || 0}
          icon={<AlertCircle className="text-rose-600" />}
          color="rose"
          loading={loading}
        />
        <StatCard
          title="分账完成率"
          value={`${stats?.splitCompletionRate || 0}%`}
          icon={<TrendingUp className="text-emerald-600" />}
          color="emerald"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">7日订单趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={2} name="订单数" />
                <Line type="monotone" dataKey="processed" stroke="#10b981" strokeWidth={2} name="已分账" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">分账构成</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: '场馆运营', value: 2850 },
                { name: '票务服务', value: 1425 },
                { name: '主办方', value: 18525 },
                { name: '艺术家', value: 8550 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, loading, badge }: {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  loading: boolean
  badge?: string
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50',
    amber: 'bg-amber-50',
    rose: 'bg-rose-50',
    emerald: 'bg-emerald-50',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {loading ? '...' : value}
          </p>
          {badge && (
            <p className="text-xs text-slate-500 mt-1">{badge}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
