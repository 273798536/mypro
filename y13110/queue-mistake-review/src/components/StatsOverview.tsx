import { useMistakeData } from '../hooks/useMistakeData'

export default function StatsOverview() {
  const { stats } = useMistakeData()

  const statItems = [
    { label: '总题数', value: stats.total, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: '📋' },
    { label: '待处理', value: stats.pending, color: 'bg-primary-50 text-primary-700 border-primary-200', icon: '⏳' },
    { label: '单位问题', value: stats.unitIssue, color: 'bg-warning-50 text-warning-700 border-warning-200', icon: '⚠️' },
    { label: '待人工确认', value: stats.needsConfirm, color: 'bg-danger-50 text-danger-700 border-danger-200', icon: '❓' },
    { label: '已完成', value: stats.completed, color: 'bg-success-50 text-success-700 border-success-200', icon: '✅' },
    { label: '晚到附件', value: stats.withLateAttachment, color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '📎' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {statItems.map(item => (
        <div
          key={item.label}
          className={`${item.color} border rounded-lg p-3 transition-shadow hover:shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-2xl font-bold">{item.value}</span>
          </div>
          <div className="text-xs mt-1 opacity-80">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
