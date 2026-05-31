import { AlertTriangle, ArrowRightLeft, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import CountryFlag from './CountryFlag'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cross_period_rate: {
    label: '税率跨期',
    icon: <ArrowRightLeft size={16} />,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  late_return: {
    label: '退货晚到',
    icon: <Clock size={16} />,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  country_mismatch: {
    label: '国家错配',
    icon: <AlertTriangle size={16} />,
    color: 'bg-coral-50 text-coral-600 border-coral-200',
  },
}

interface Exception {
  id: string
  type: string
  country: string
  period: string
  reference_id: string
  reference_type: string
  description: string
  impact: number
  status: string
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

interface ExceptionCardProps {
  exception: Exception
  onConfirm: (id: string) => void
  onReject: (id: string) => void
}

export default function ExceptionCard({ exception, onConfirm, onReject }: ExceptionCardProps) {
  const typeConfig = TYPE_CONFIG[exception.type] || {
    label: exception.type,
    icon: <AlertTriangle size={16} />,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  const isPending = exception.status === 'pending'

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeConfig.color}`}
          >
            {typeConfig.icon}
            {typeConfig.label}
          </span>
          <CountryFlag code={exception.country} />
          <span className="text-xs text-gray-400">{exception.period}</span>
        </div>
        <StatusBadge status={exception.status} />
      </div>

      <div className="mb-2">
        <span className="text-xs text-gray-400">参考编号: </span>
        <span className="text-sm font-medium text-navy-500">{exception.reference_id}</span>
      </div>

      <p className="text-sm text-gray-600 mb-3">{exception.description}</p>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-400">影响金额: </span>
          <span
            className={`text-sm font-semibold ${
              exception.impact < 0 ? 'text-coral-500' : 'text-emerald-500'
            }`}
          >
            €{Math.abs(exception.impact).toLocaleString('zh-CN')}
          </span>
        </div>

        {isPending && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReject(exception.id)}
              className="px-3 py-1.5 text-xs text-coral-500 border border-coral-200 rounded-lg hover:bg-coral-50"
            >
              驳回
            </button>
            <button
              onClick={() => onConfirm(exception.id)}
              className="px-3 py-1.5 text-xs text-white bg-emerald-500 rounded-lg hover:bg-emerald-600"
            >
              确认
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
