import { MapPin, Clock, Layers, AlertTriangle, Eye } from 'lucide-react'
import type { NormalRecord, Severity } from '@/types'
import StatusBadge from './StatusBadge'

interface RecordCardProps {
  record: NormalRecord
  selected?: boolean
  onClick: () => void
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSeverityLabel(severity: Severity | null): string {
  switch (severity) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return '低'
  }
}

function RecordCard({ record, selected, onClick }: RecordCardProps) {
  const hasOcclusion = record.occlusion?.detected
  const normalDeviationCount = record.normalVectors?.length || 0

  return (
    <div
      onClick={onClick}
      className={`bg-bg-card border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 ${
        selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-text-muted">#{record.id.slice(0, 8)}</span>
          <StatusBadge status={record.status} />
          {hasOcclusion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/40">
              <Eye size={12} />
              透明遮挡
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <AlertTriangle
            size={12}
            className={
              record.occlusion?.severity === 'high' || record.status === 'failed'
                ? 'text-danger'
                : 'text-text-muted'
            }
          />
          <span>严重程度: {getSeverityLabel(record.occlusion?.severity)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-text-secondary">
          <Layers size={14} className="text-text-muted" />
          <span>设备: {record.deviceId}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <Clock size={14} className="text-text-muted" />
          <span>{formatDate(record.timestamp)}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <MapPin size={14} className="text-text-muted" />
          <span>
            坐标: ({record.deviceCoordinates.x}, {record.deviceCoordinates.y}, {record.deviceCoordinates.z})
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <Layers size={14} className="text-text-muted" />
          <span>点数: {record.pointCount.toLocaleString()}</span>
        </div>
      </div>

      {normalDeviationCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">法线偏差样本</span>
            <span className="text-text-secondary">{normalDeviationCount} 个</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordCard
