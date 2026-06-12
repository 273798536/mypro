import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  description?: string
  highlight?: boolean
}

export default function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  description,
  highlight = false,
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  }

  return (
    <div
      className={`bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-md ${
        highlight
          ? 'border-primary-300 shadow-md bg-gradient-to-br from-primary-50 to-white'
          : 'border-gray-100 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && (
          <div className={`p-2 rounded-lg ${highlight ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-serif ${highlight ? 'text-primary-800' : 'text-gray-800'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>

      {(trend || description) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && trendValue && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trendColors[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          {description && (
            <span className="text-xs text-gray-400">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}
