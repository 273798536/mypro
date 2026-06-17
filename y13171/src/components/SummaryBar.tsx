import { getSummaryText, formatTime, getPageSummaryPhrase } from '@/utils/format'
import type { WarningRecord } from '@/types'
import { useAppStore } from '@/store'
import { BarChart3, ShieldAlert, Clock, CheckCircle2, FileText } from 'lucide-react'

interface Props {
  selectedRecord: WarningRecord | null
}

export default function SummaryBar({ selectedRecord }: Props) {
  const records = useAppStore((s) => s.records)
  const { total, warningCount, suspendedCount, confirmedCount, lastModified } = getSummaryText(records)
  const pageSummaryPhrase = getPageSummaryPhrase(records, selectedRecord)

  return (
    <div className="bg-navy rounded-xl p-5 text-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-wide">梁体挠度阈值预警</h1>
          <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{pageSummaryPhrase}</p>
        </div>
        {lastModified && (
          <span className="text-xs text-white/50 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            最近操作 {formatTime(lastModified)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white/60">记录总数</span>
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="bg-orange/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-orange-light" />
            <span className="text-xs text-orange-light/80">预警中</span>
          </div>
          <p className="text-2xl font-bold text-orange-light">{warningCount}</p>
        </div>

        <div className="bg-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span className="text-xs text-amber-300/80">待确认</span>
          </div>
          <p className="text-2xl font-bold text-amber-300">{suspendedCount}</p>
        </div>

        <div className="bg-blue-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-300" />
            <span className="text-xs text-blue-300/80">已确认</span>
          </div>
          <p className="text-2xl font-bold text-blue-300">{confirmedCount}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-start gap-2">
        <FileText className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
        <p className="text-xs text-white/40 leading-relaxed">
          数据来源说明：实测值由传感器自动采集，阈值依据《公路桥梁技术状况评定标准》。场景标注、页面摘要、侧边说明源自同一场景标注字段，确保三处描述一致。
        </p>
      </div>

      {selectedRecord && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-white/50 leading-relaxed">
            <span className="text-white/70 font-medium">当前聚焦：</span>
            设备 {selectedRecord.deviceId} · {selectedRecord.sceneLabel} · 实测 {selectedRecord.measuredValue.toFixed(1)}mm / 阈值 {selectedRecord.threshold.toFixed(1)}mm · 来源 {selectedRecord.sourceTag}
          </p>
        </div>
      )}
    </div>
  )
}
