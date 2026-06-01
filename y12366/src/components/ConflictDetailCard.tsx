import { useState } from 'react'
import { Clock, CameraOff, AlertTriangle, ChevronDown, History } from 'lucide-react'
import type { ConflictEntry } from '@/types'

const severityConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'text-saturated border-saturated/40', label: '高' },
  medium: { color: 'text-warn border-warn/40', label: '中' },
  low: { color: 'text-photo border-photo/40', label: '低' },
}

const typeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  timestamp_drift: { icon: Clock, label: '时间戳漂移' },
  photo_missing: { icon: CameraOff, label: '照片缺失' },
  sensor_saturated_late: { icon: AlertTriangle, label: '传感器饱和延迟' },
}

export default function ConflictDetailCard({ conflict }: { conflict: ConflictEntry }) {
  const [expanded, setExpanded] = useState(false)

  const severity = severityConfig[conflict.severity] ?? severityConfig.low
  const type = typeConfig[conflict.type] ?? { icon: AlertTriangle, label: conflict.type }
  const TypeIcon = type.icon

  return (
    <div className={`rounded-lg border bg-steel-900 transition-all ${severity.color}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <TypeIcon size={16} className={severity.color.split(' ')[0]} />
          <span className="text-sm font-medium text-steel-300">{type.label}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${severity.color}`}>
            {severity.label}
          </span>
          <span className="text-[10px] font-mono text-steel-500">#{conflict.sequenceOrder}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-steel-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-steel-700 pt-3">
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-steel-500 mb-1 font-mono">描述</h4>
            <p className="text-sm text-steel-300 leading-relaxed">{conflict.description}</p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-steel-500 mb-1 font-mono">关联数据源</h4>
            <div className="flex flex-wrap gap-1.5">
              {conflict.relatedSourceIds.map((id) => (
                <span
                  key={id}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-steel-800 text-signal border border-steel-700"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-steel-500 mb-2 font-mono">判定历史</h4>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <History size={12} className="text-signal" />
                <div className="w-px h-full bg-steel-700 mt-1" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-steel-300">{conflict.judgment}</span>
                </div>
                <span className="text-[10px] font-mono text-steel-500">
                  {new Date(conflict.judgmentAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-[10px] font-mono text-steel-500">
              {new Date(conflict.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
