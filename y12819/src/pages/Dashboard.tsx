import { useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, AlertCircle, Database } from 'lucide-react'
import { useAppStore } from '@/store'

const anomalyTypeConfig = {
  batch_mismatch: {
    label: '批号不匹配',
    icon: AlertTriangle,
    suggestion: '建议修改口径',
    borderColor: 'border-amber-400',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  boundary_unclear: {
    label: '标注边界不清',
    icon: AlertCircle,
    suggestion: '建议补充材料',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
  },
  data_missing: {
    label: '数据缺失',
    icon: Database,
    suggestion: '建议重新采样',
    borderColor: 'border-sky-400',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    iconColor: 'text-sky-500',
  },
}

const STATUS_COLORS = {
  normal: '#10B981',
  pending_review: '#F59E0B',
  anomaly: '#EF4444',
}

const STATUS_LABELS = {
  normal: '正常',
  pending_review: '待复核',
  anomaly: '异常',
}

const STATUS_DESCRIPTIONS = {
  normal: '培养记录通过校验，试剂批号匹配',
  pending_review: '存在信息缺失，需补充',
  anomaly: '试剂批号不匹配，需处理',
}

export default function Dashboard() {
  const { records, anomalySummary, statistics, fetchRecords, fetchAnomalySummary, fetchStatistics } = useAppStore()

  useEffect(() => {
    fetchRecords()
    fetchAnomalySummary()
    fetchStatistics()
  }, [fetchRecords, fetchAnomalySummary, fetchStatistics])

  const statusCounts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const pieData = Object.entries(statusCounts).map(([key, value]) => ({
    name: STATUS_LABELS[key as keyof typeof STATUS_LABELS] || key,
    value,
    status: key,
  }))

  return (
    <div className="space-y-6">
      <h2 className="font-title text-2xl font-semibold text-slate-800">仪表盘</h2>

      <section>
        <h3 className="text-lg font-medium text-slate-700 mb-4">异常分类</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(anomalyTypeConfig) as [keyof typeof anomalyTypeConfig, typeof anomalyTypeConfig[keyof typeof anomalyTypeConfig]][]).map(
            ([type, config]) => {
              const Icon = config.icon
              const count = anomalySummary?.typeCounts[type]?.count ?? 0
              return (
                <div
                  key={type}
                  className={`bg-white rounded-xl shadow-sm border-l-4 ${config.borderColor} p-5 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${config.textColor}`}>{config.label}</p>
                      <p className="text-3xl font-bold text-slate-800 mt-1">{count}</p>
                    </div>
                    <div className={`${config.bgColor} ${config.iconColor} p-3 rounded-lg`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{config.suggestion}</p>
                </div>
              )
            }
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-slate-700 mb-4">培养记录状态概览</h3>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-64 h-64 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#94A3B8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-4">
              {(Object.entries(STATUS_LABELS) as [keyof typeof STATUS_LABELS, string][]).map(
                ([status, label]) => (
                  <div key={status} className="flex items-start gap-3">
                    <div
                      className="w-4 h-4 rounded-sm mt-0.5 shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                    <div>
                      <p className="font-medium text-slate-800">
                        {label}：
                        <span className="text-lg font-bold">
                          {statusCounts[status] ?? 0}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500">
                        {STATUS_DESCRIPTIONS[status]}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-slate-700 mb-4">分组统计摘要</h3>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-slate-600 font-medium">实验组</th>
                <th className="text-right px-6 py-3 text-slate-600 font-medium">总数</th>
                <th className="text-right px-6 py-3 text-slate-600 font-medium">正常</th>
                <th className="text-right px-6 py-3 text-slate-600 font-medium">异常</th>
                <th className="text-right px-6 py-3 text-slate-600 font-medium">待复核</th>
                <th className="text-right px-6 py-3 text-slate-600 font-medium">异常率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statistics.map((g) => (
                <tr key={g.group_name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{g.group_name}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{g.total}</td>
                  <td className="px-6 py-3 text-right text-emerald-600">{g.normal}</td>
                  <td className="px-6 py-3 text-right text-red-600">{g.anomaly}</td>
                  <td className="px-6 py-3 text-right text-amber-600">{g.pending_review}</td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        g.anomaly_rate > 30
                          ? 'bg-red-100 text-red-700'
                          : g.anomaly_rate > 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {g.anomaly_rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {statistics.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
