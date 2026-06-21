import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import type { DashboardRecord, RecordStatus } from '../../shared/types'

const typeLabels: Record<string, string> = {
  sample: '样本',
  threshold: '阈值',
  manual: '人工修正',
  metric: '指标',
}

const statusLabels: Record<string, string> = {
  processed: '已处理',
  pending: '待补充',
  anomalous: '异常',
}

const statusColors: Record<string, string> = {
  processed: 'text-[#34D399] bg-[#0D2818] border-[#10B981]/30',
  pending: 'text-[#FBBF24] bg-[#1A1708] border-[#F59E0B]/30',
  anomalous: 'text-[#F87171] bg-[#1C0A0A] border-[#EF4444]/30',
}

const nextStatusMap: Record<string, RecordStatus> = {
  pending: 'processed',
  anomalous: 'processed',
}

function ContaminationCard({ record }: { record: DashboardRecord }) {
  const [expanded, setExpanded] = useState(true)
  const updateStatus = useDashboardStore(s => s.updateRecordStatus)

  return (
    <div className="mt-2 bg-[#1C0A0A] border border-[#F59E0B]/30 border-l-4 border-l-[#F59E0B] rounded-lg p-3">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />
        <span className="text-[#FBBF24] text-xs font-medium">验证集污染</span>
        {expanded ? <ChevronUp size={14} className="text-[#5A7080] ml-auto" /> : <ChevronDown size={14} className="text-[#5A7080] ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-2">
          {record.contaminationNote && (
            <p className="text-[#F87171] text-xs leading-relaxed mb-3">{record.contaminationNote}</p>
          )}
          {record.nextSteps && (
            <div className="space-y-1.5 mb-3">
              <p className="text-[#7B8FA3] text-[10px] uppercase tracking-wider font-medium">操作指引</p>
              {record.nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#7DD3FC] text-xs font-bold shrink-0 w-4">{i + 1}</span>
                  <span className="text-[#B0C4D8] text-xs leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          )}
          {record.status !== 'processed' && (
            <button
              onClick={() => updateStatus(record.id, 'processed')}
              className="flex items-center gap-1.5 text-xs text-[#34D399] hover:text-[#10B981] bg-[#0D2818] hover:bg-[#10B981]/20 border border-[#10B981]/30 rounded-md px-3 py-1.5 transition-colors"
            >
              <Check size={12} />
              标记为已处理
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function RecordTable() {
  const records = useDashboardStore(s => s.records)
  const updateStatus = useDashboardStore(s => s.updateRecordStatus)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1B3A4B]">
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">来源</th>
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">原始值</th>
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">当前值</th>
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">类型</th>
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">状态</th>
            <th className="text-left text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">日志引用</th>
            <th className="text-right text-[#5A7080] text-xs font-medium py-3 px-4 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr
              key={record.id}
              className={`border-b border-[#1B3A4B]/50 transition-colors ${
                record.isContaminated
                  ? 'bg-[#1C0A0A]/60'
                  : 'hover:bg-[#132D42]/60'
              }`}
            >
              <td colSpan={7} className="p-0">
                <div className="flex items-start">
                  <div className="flex-1 grid grid-cols-7 gap-0">
                    <div className="py-3 px-4 text-[#B0C4D8] text-sm col-span-1">
                      <div className="flex items-center gap-1.5">
                        {record.isContaminated && <AlertTriangle size={12} className="text-[#F59E0B] shrink-0" />}
                        <span className="truncate">{record.source}</span>
                      </div>
                    </div>
                    <div className="py-3 px-4 text-sm col-span-1">
                      {record.originalValue !== null && record.originalValue !== record.currentValue ? (
                        <span className="line-through text-[#5A7080] decoration-[#EF4444]/50">{record.originalValue}</span>
                      ) : (
                        <span className="text-[#7B8FA3]">—</span>
                      )}
                    </div>
                    <div className="py-3 px-4 text-[#E0E7EF] text-sm font-medium col-span-1">{record.currentValue}</div>
                    <div className="py-3 px-4 col-span-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0D1B2A] border border-[#1B3A4B] text-[#7B8FA3]">
                        {typeLabels[record.changeType] || record.changeType}
                      </span>
                    </div>
                    <div className="py-3 px-4 col-span-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </span>
                    </div>
                    <div className="py-3 px-4 text-[#5A7080] text-xs font-mono col-span-1 truncate">{record.rawLogRef || '—'}</div>
                    <div className="py-3 px-4 text-right col-span-1">
                      {record.status !== 'processed' && nextStatusMap[record.status] && (
                        <button
                          onClick={() => updateStatus(record.id, nextStatusMap[record.status])}
                          className="text-[#7DD3FC] text-xs hover:text-[#BAE6FD] transition-colors"
                        >
                          标记已处理
                        </button>
                      )}
                      {record.status === 'processed' && (
                        <span className="text-[#10B981] text-xs flex items-center justify-end gap-1">
                          <Check size={12} /> 完成
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {record.isContaminated && <ContaminationCard record={record} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && (
        <div className="py-12 text-center text-[#5A7080] text-sm">暂无匹配记录</div>
      )}
    </div>
  )
}
