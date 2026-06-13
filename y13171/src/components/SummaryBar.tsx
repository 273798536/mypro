import { getSummaryText, formatTime } from '@/utils/format'
import { useAppStore } from '@/store'
import { BarChart3, ShieldAlert, Clock } from 'lucide-react'

export default function SummaryBar() {
  const records = useAppStore((s) => s.records)
  const { total, warningCount, suspendedCount, lastModified } = getSummaryText(records)

  return (
    <div className="bg-navy rounded-xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold tracking-wide">梁体挠度阈值预警</h1>
        {lastModified && (
          <span className="text-xs text-white/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            最近操作 {formatTime(lastModified)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <p className="text-xs text-white/40 mt-3 leading-relaxed">
        数据来源说明：实测值由传感器自动采集，阈值依据《公路桥梁技术状况评定标准》
      </p>
    </div>
  )
}
