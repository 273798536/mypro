import { cn } from '@/lib/utils'
import type { EquipmentRecord } from '@/types'
import { ChevronDown, ChevronRight, AlertTriangle, FileText } from 'lucide-react'

interface RecordCardProps {
  record: EquipmentRecord
  isExpanded: boolean
  onToggle: () => void
  hasDuplicate: boolean
  onTraceDuplicate: () => void
}

const statusLabelMap: Record<EquipmentRecord['recordType'], string> = {
  smooth: '顺利',
  supplementary: '补录',
  anomalous: '异常',
}

const statusBarMap: Record<EquipmentRecord['recordType'], string> = {
  smooth: 'status-bar-smooth',
  supplementary: 'status-bar-supplementary',
  anomalous: 'status-bar-anomalous',
}

const tagClassMap: Record<EquipmentRecord['recordType'], string> = {
  smooth: 'tag-smooth',
  supplementary: 'tag-supplementary',
  anomalous: 'tag-anomalous',
}

export default function RecordCard({
  record,
  isExpanded,
  onToggle,
  hasDuplicate,
  onTraceDuplicate,
}: RecordCardProps) {
  const deviation =
    ((record.measuredTension - record.ratedTension) / record.ratedTension * 100).toFixed(2) + '%'

  return (
    <div
      className={cn(
        'card-base flex transition-colors hover:bg-base-700/50',
        statusBarMap[record.recordType],
        isExpanded ? 'border-b border-b-base-600' : ''
      )}
    >
      <div className="flex-1 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="text-base-500 hover:text-industrial-blue-light transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            <span className="font-mono text-xs text-base-500">{record.id}</span>
            <span className="font-mono text-sm text-base-500">{record.equipmentCode}</span>
            <span className={tagClassMap[record.recordType]}>
              {statusLabelMap[record.recordType]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasDuplicate && (
              <button
                onClick={onTraceDuplicate}
                className="flex items-center gap-1 bg-warn-orange/20 text-warn-orange text-xs font-mono px-2 py-0.5 rounded hover:bg-warn-orange/30 transition-colors"
              >
                <AlertTriangle size={12} />
                设备编号重复
              </button>
            )}
            <FileText size={14} className="text-base-500" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-2">
          <div>
            <div className="text-xs text-base-500">额定张力</div>
            <div className="param-value">{record.ratedTension}</div>
          </div>
          <div>
            <div className="text-xs text-base-500">实测张力</div>
            <div className="param-value">{record.measuredTension}</div>
          </div>
          <div>
            <div className="text-xs text-base-500">偏差</div>
            <div className="param-value">{deviation}</div>
          </div>
          <div>
            <div className="text-xs text-base-500">参数版本</div>
            <div className="param-value">{record.paramVersion}</div>
          </div>
        </div>

        <div className="text-xs text-base-500">
          判定：<span className="text-industrial-blue-light font-mono">{record.judgment}</span>
        </div>
      </div>
    </div>
  )
}
