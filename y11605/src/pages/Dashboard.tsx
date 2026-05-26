import { useEffect } from 'react'
import { Users, DollarSign, AlertTriangle, RefreshCcw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import StatusBadge from '../components/UI/StatusBadge'

export default function Dashboard() {
  const { stats, fetchStats, fetchParticipants } = useAppStore()

  useEffect(() => {
    fetchStats()
    fetchParticipants({ pageSize: 5 })
  }, [fetchStats, fetchParticipants])

  const statCards = stats
    ? [
        {
          label: '总参与人数',
          value: stats.counts.total,
          icon: Users,
          color: 'bg-blue-500',
        },
        {
          label: '待计算',
          value: stats.counts.pending,
          icon: RefreshCcw,
          color: 'bg-slate-500',
        },
        {
          label: '异常项',
          value: stats.counts.withAnomalies,
          icon: AlertTriangle,
          color: 'bg-orange-500',
        },
        {
          label: '预计退款总额',
          value: `¥${stats.amounts.totalActualRefund.toFixed(2)}`,
          icon: DollarSign,
          color: 'bg-green-500',
        },
      ]
    : []

  const statusDistribution = stats
    ? [
        { label: '待计算', count: stats.counts.pending, color: 'bg-slate-200' },
        { label: '已计算', count: stats.counts.calculated, color: 'bg-blue-200' },
        { label: '已确认', count: stats.counts.confirmed, color: 'bg-green-200' },
        { label: '已冻结', count: stats.counts.frozen, color: 'bg-gray-200' },
        { label: '已退款', count: stats.counts.refunded, color: 'bg-emerald-200' },
      ]
    : []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">退款概览</h1>
        <p className="text-sm text-slate-500 mt-1">项目退款进度和关键指标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">状态分布</h2>
          <div className="space-y-3">
            {statusDistribution.map((item) => {
              const total = stats?.counts.total || 1
              const percentage = ((item.count / total) * 100).toFixed(1)
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-medium text-slate-900">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">金额汇总</h2>
          {stats && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-600">支付总额</span>
                <span className="font-semibold text-slate-900">
                  ¥{stats.amounts.totalPayAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-600">应退总额</span>
                <span className="font-semibold text-slate-900">
                  ¥{stats.amounts.totalRefundAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-600">手续费总额</span>
                <span className="font-semibold text-orange-600">
                  ¥{stats.amounts.totalFeeAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-600 font-medium">实际退款</span>
                <span className="text-lg font-bold text-green-600">
                  ¥{stats.amounts.totalActualRefund.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => (window.location.hash = '#/participants')}
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <Users className="h-6 w-6 text-blue-500 mb-2" />
            <p className="font-medium text-slate-900">管理参与人</p>
            <p className="text-sm text-slate-500">查看和编辑参与人信息</p>
          </button>
          <button
            onClick={() => (window.location.hash = '#/calculation')}
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <RefreshCcw className="h-6 w-6 text-green-500 mb-2" />
            <p className="font-medium text-slate-900">执行退款计算</p>
            <p className="text-sm text-slate-500">批量计算退款金额</p>
          </button>
          <button
            onClick={() => (window.location.hash = '#/batches')}
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <DollarSign className="h-6 w-6 text-purple-500 mb-2" />
            <p className="font-medium text-slate-900">管理批次</p>
            <p className="text-sm text-slate-500">创建和执行退款批次</p>
          </button>
        </div>
      </div>
    </div>
  )
}
