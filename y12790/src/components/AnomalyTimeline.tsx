import {
  FileQuestion,
  Copy,
  FileText,
  GitMerge,
  Scale,
  Thermometer,
  Droplets,
  Activity,
  ExternalLink,
} from 'lucide-react'
import type { AnomalyEntry } from '@/types'
import { cn } from '@/lib/utils'

const anomalyTypeConfig: Record<
  AnomalyEntry['anomalyType'],
  { icon: typeof FileQuestion; label: string }
> = {
  empty_field: { icon: FileQuestion, label: '空字段' },
  duplicate: { icon: Copy, label: '重复数据' },
  mixed_notes: { icon: FileText, label: '混合备注' },
  peak_overlap: { icon: GitMerge, label: '峰重叠' },
  balance_deviation: { icon: Scale, label: '平衡偏差' },
  temp_exceed: { icon: Thermometer, label: '温度超限' },
  ph_exceed: { icon: Droplets, label: 'pH超限' },
  curve_break: { icon: Activity, label: '曲线断裂' },
}

const severityColors: Record<AnomalyEntry['severity'], { dot: string; bg: string; border: string }> = {
  low: { dot: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  medium: { dot: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  high: { dot: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200' },
}

const severityLabels: Record<AnomalyEntry['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}

interface AnomalyTimelineProps {
  anomalies: AnomalyEntry[]
}

export default function AnomalyTimeline({ anomalies }: AnomalyTimelineProps) {
  if (anomalies.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无异常记录
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {anomalies.map((anomaly, index) => {
        const typeConfig = anomalyTypeConfig[anomaly.anomalyType]
        const severityConfig = severityColors[anomaly.severity]
        const Icon = typeConfig.icon
        const isLast = index === anomalies.length - 1

        return (
          <div key={anomaly.id} className="relative flex gap-4 pb-6">
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                  severityConfig.bg,
                  severityConfig.border
                )}
              >
                <Icon size={15} className="text-slate-600" />
              </div>
              {!isLast && (
                <div className="absolute top-8 bottom-0 w-px bg-slate-200" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {typeConfig.label}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white',
                    severityConfig.dot
                  )}
                >
                  {severityLabels[anomaly.severity]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {anomaly.description}
              </p>
              <a
                href={`#${anomaly.sourceField}`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-amber-600"
              >
                <ExternalLink size={11} />
                来源: {anomaly.sourceField}
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
