import { AlertOctagon, Clock, CheckCircle2, BarChart3 } from 'lucide-react'
import type { NormalRecord } from '@/types'

interface StatsSummaryProps {
  records: NormalRecord[]
}

interface StatItem {
  label: string
  count: number
  icon: typeof AlertOctagon
  color: string
  bgColor: string
  borderColor: string
}

function StatsSummary({ records }: StatsSummaryProps) {
  const failedCount = records.filter((r) => r.status === 'failed').length
  const reviewCount = records.filter((r) => r.status === 'review').length
  const passedCount = records.filter((r) => r.status === 'passed').length
  const totalCount = records.length

  const stats: StatItem[] = [
    {
      label: '不合格',
      count: failedCount,
      icon: AlertOctagon,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger/30',
    },
    {
      label: '待复核',
      count: reviewCount,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    {
      label: '已通过',
      count: passedCount,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
    },
    {
      label: '总计',
      count: totalCount,
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className={`bg-bg-card border ${stat.borderColor} rounded-lg p-4 flex items-center gap-4`}
          >
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <Icon size={24} className={stat.color} />
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsSummary
