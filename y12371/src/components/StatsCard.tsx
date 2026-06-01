import { Music, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface StatsCardProps {
  total: number
  normal: number
  pending: number
  anomaly: number
}

export default function StatsCard({ total, normal, pending, anomaly }: StatsCardProps) {
  const stats = [
    {
      label: '曲谱总数',
      value: total,
      icon: Music,
      color: 'from-gold-400 to-gold-600',
      textColor: 'text-gold-400',
      bgColor: 'bg-gold-500/10',
    },
    {
      label: '正常',
      value: normal,
      icon: CheckCircle,
      color: 'from-emerald-400 to-emerald-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: '待确认',
      value: pending,
      icon: Clock,
      color: 'from-amber-400 to-amber-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: '异常',
      value: anomaly,
      icon: AlertTriangle,
      color: 'from-red-400 to-red-600',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-xl bg-navy-800/50 p-5 card-hover gold-border"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-navy-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-display font-bold text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-500`}
                  style={{ width: `${total > 0 ? (stat.value / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
