import { useState } from 'react'
import { AlertTriangle, AlertCircle, XCircle, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Alert } from '@/shared/types'

interface AlertBannerProps {
  alert: Alert
  onResolve?: (alertId: string) => void
  className?: string
}

const severityConfig = {
  warning: {
    color: 'yellow',
    bgClass: 'bg-yellow-950/40',
    borderClass: 'border-yellow-500/60',
    barClass: 'bg-yellow-500',
    iconClass: 'text-yellow-400',
    textClass: 'text-yellow-300',
    label: '警告',
    Icon: AlertTriangle,
  },
  severe: {
    color: 'orange',
    bgClass: 'bg-orange-950/40',
    borderClass: 'border-orange-500/60',
    barClass: 'bg-orange-500',
    iconClass: 'text-orange-400',
    textClass: 'text-orange-300',
    label: '严重',
    Icon: AlertCircle,
  },
  fatal: {
    color: 'red',
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-500/60',
    barClass: 'bg-red-500',
    iconClass: 'text-red-400',
    textClass: 'text-red-300',
    label: '致命',
    Icon: XCircle,
  },
}

const categoryLabels: Record<string, string> = {
  sampling_gap: '采样数据缺口',
  temperature_drift: '温度漂移',
  parameter_divergence: '参数发散',
}

export default function AlertBanner({ alert, onResolve, className }: AlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = severityConfig[alert.severity]
  const { Icon } = config

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border overflow-hidden transition-all duration-300',
        config.bgClass,
        config.borderClass,
        alert.resolved && 'opacity-60',
        className
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.barClass)} />

      <div className="flex items-stretch">
        <div className="flex items-center px-4 py-3">
          <Icon
            className={cn(
              'w-5 h-5 flex-shrink-0',
              config.iconClass,
              !alert.resolved && 'animate-pulse'
            )}
          />
        </div>

        <div className="flex-1 min-w-0 py-3 pr-2">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded',
                config.bgClass,
                config.textClass,
                config.borderClass,
                'border'
              )}
            >
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {categoryLabels[alert.category] || alert.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatTime(alert.timestamp)}
            </div>
            {alert.resolved && (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                已解决
              </span>
            )}
          </div>

          <div className="mt-1 text-sm text-gray-200 pr-2">
            {alert.message}
          </div>
        </div>

        <div className="flex items-center gap-1 px-2">
          {alert.details && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded hover:bg-gray-700/50"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {onResolve && !alert.resolved && (
            <button
              onClick={() => onResolve(alert.id)}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors rounded hover:bg-gray-700/50"
              title="标记为已解决"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && alert.details && (
        <div className="px-4 pb-4 pt-2 ml-5 border-t border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">告警详情</div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-sm font-mono space-y-1">
            {Object.entries(alert.details).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500">{key}:</span>
                <span className="text-gray-300">
                  {typeof value === 'number' ? value.toFixed(4) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
