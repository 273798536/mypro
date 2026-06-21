import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardRecord } from '../../shared/types'

interface AlertListProps {
  alerts: DashboardRecord[]
}

const statusConfig = {
  pending: { label: '待补充', color: 'text-[#FBBF24] bg-[#1A1708] border-[#F59E0B]/30' },
  anomalous: { label: '异常', color: 'text-[#F87171] bg-[#1C0A0A] border-[#EF4444]/30' },
  processed: { label: '已处理', color: 'text-[#34D399] bg-[#0D2818] border-[#10B981]/30' },
}

const typeLabels: Record<string, string> = {
  sample: '样本',
  threshold: '阈值',
  manual: '人工修正',
  metric: '指标',
}

export default function AlertList({ alerts }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-5 shadow-lg">
        <h3 className="text-[#B0C4D8] text-sm font-medium mb-4">待处理告警</h3>
        <p className="text-[#5A7080] text-sm py-8 text-center">暂无待处理告警</p>
      </div>
    )
  }

  return (
    <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#B0C4D8] text-sm font-medium">待处理告警</h3>
        <Link to="/detail" className="text-[#7DD3FC] text-xs hover:text-[#BAE6FD] transition-colors flex items-center gap-1">
          查看全部 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {alerts.map(alert => {
          const sc = statusConfig[alert.status]
          return (
            <div
              key={alert.id}
              className={`rounded-lg p-4 border transition-all hover:shadow-md ${
                alert.isContaminated
                  ? 'bg-[#1C0A0A] border-[#EF4444]/40 border-l-4 border-l-[#F59E0B]'
                  : 'bg-[#132D42] border-[#1B3A4B]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {alert.isContaminated && <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />}
                    <span className="text-[#B0C4D8] text-sm font-medium truncate">{alert.source}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.color}`}>
                      {sc.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0D1B2A] border border-[#1B3A4B] text-[#7B8FA3]">
                      {typeLabels[alert.changeType] || alert.changeType}
                    </span>
                  </div>
                  {alert.isContaminated && alert.contaminationNote && (
                    <p className="text-[#F87171] text-xs mt-2 leading-relaxed">{alert.contaminationNote}</p>
                  )}
                  {alert.nextSteps && (
                    <ol className="mt-2 space-y-1">
                      {alert.nextSteps.map((step, i) => (
                        <li key={i} className="text-[#7DD3FC] text-xs flex gap-2">
                          <span className="text-[#5A7080] shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[#7B8FA3] text-xs">{alert.currentValue}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
