import React from 'react'
import { STATUS_LABEL, SOURCE_LABEL, formatValue, formatTime, getSceneDescription } from '@/utils/format'
import type { WarningRecord } from '@/types'
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle, RotateCcw } from 'lucide-react'

interface Props {
  record: WarningRecord
  onConfirm: (id: string) => void
  onReject: (id: string) => void
  onExpand: (id: string) => void
  isExpanded: boolean
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  normal: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-orange" />,
  suspended: <ShieldAlert className="w-4 h-4 text-amber-600" />,
  confirmed: <CheckCircle2 className="w-4 h-4 text-blue-600" />,
  rejected: <XCircle className="w-4 h-4 text-red-600" />,
}

const STATUS_CLASS: Record<string, string> = {
  normal: 'status-normal',
  warning: 'status-warning',
  suspended: 'status-suspended',
  confirmed: 'status-confirmed',
  rejected: 'status-rejected',
}

export default function WarningCard({ record, onConfirm, onReject, onExpand, isExpanded }: Props) {
  const isOverThreshold = record.measuredValue > record.threshold

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
        isOverThreshold ? 'border-orange/30' : 'border-surface-dark'
      } ${isExpanded ? 'ring-2 ring-navy/20 shadow-md' : ''}`}
      onClick={() => onExpand(record.id)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {STATUS_ICON[record.status]}
            <span className="font-bold text-navy text-base">{record.deviceId}</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[record.status]}`}
          >
            {STATUS_LABEL[record.status]}
          </span>
        </div>

        <div className="flex items-baseline gap-3 mb-2">
          <div>
            <span className="text-xs text-steel">实测值</span>
            <p className={`text-lg font-bold ${isOverThreshold ? 'text-orange' : 'text-emerald-600'}`}>
              {formatValue(record.measuredValue)}
            </p>
          </div>
          <div className="text-steel/40">/</div>
          <div>
            <span className="text-xs text-steel">阈值</span>
            <p className="text-lg font-bold text-navy">{formatValue(record.threshold)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy/5 rounded text-xs text-navy">
            {record.sceneLabel}
          </span>
          {record.isBackfilled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs border border-amber-200">
              <RotateCcw className="w-3 h-3" />
              补录
            </span>
          )}
        </div>

        <div className="flex items-start gap-1.5 text-sm text-navy/80">
          <span className="text-steel shrink-0">备注</span>
          <span>{record.note}</span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-steel">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(record.recordTime)}
          </span>
          <span className="px-1.5 py-0.5 bg-surface rounded text-navy/60">
            {record.sourceTag}
          </span>
        </div>

        {record.isBackfilled && record.originalTime && (
          <div className="mt-1 text-xs text-amber-600/80">
            原始事件时间：{formatTime(record.originalTime)}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div className="border-t border-surface-dark pt-3">
            <p className="text-xs text-steel leading-relaxed">
              {getSceneDescription(record.sceneLabel)}
            </p>
          </div>

          {record.status === 'suspended' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-amber-800">
                设备编号 {record.deviceId} 与已有预警记录重复，需运营主管确认
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfirm(record.id)
                  }}
                  className="px-3 py-1.5 bg-navy text-white text-xs rounded-lg hover:bg-navy-light transition-colors"
                >
                  确认有效
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReject(record.id)
                  }}
                  className="px-3 py-1.5 border border-red-300 text-red-700 text-xs rounded-lg hover:bg-red-50 transition-colors"
                >
                  驳回
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-steel/60">
            来源标注：{SOURCE_LABEL[record.noteSource]}
            {record.isBackfilled && '（后补记录）'}
            {' · '}最后修改：{formatTime(record.lastModified)}
          </div>
        </div>
      )}
    </div>
  )
}
