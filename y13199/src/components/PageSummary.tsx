import { ClipboardCheck } from 'lucide-react'
import type { TensionReport } from '../types'
import { BOUNDARY_STATUS_LABELS, REPORT_STATUS_LABELS } from '../types'

interface Props {
  report: TensionReport | null
}

export default function PageSummary({ report }: Props) {
  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-[#1B3A5C]/20 bg-[#F8FAFB] p-6 text-center">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-[#8BA3BF]/40" />
        <p className="text-sm text-[#8BA3BF]">完成报告后，页面摘要将在此生成</p>
      </div>
    )
  }

  const boundaryColor =
    report.boundaryStatus === 'normal'
      ? 'text-[#2D9B83] bg-[#2D9B83]/10 border-[#2D9B83]/30'
      : report.boundaryStatus === 'critical'
        ? 'text-[#E8A838] bg-[#E8A838]/10 border-[#E8A838]/30'
        : 'text-[#C44D3F] bg-[#C44D3F]/10 border-[#C44D3F]/30'

  const statusColor =
    report.status === 'processed'
      ? 'bg-[#2D9B83]'
      : report.status === 'pending_material'
        ? 'bg-[#E8A838]'
        : 'bg-[#C44D3F]'

  return (
    <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
        <ClipboardCheck className="h-3.5 w-3.5" />
        页面摘要
      </h3>

      <div className="rounded-lg border bg-[#0F2640]/5 p-4">
        <p className="text-sm leading-relaxed text-[#1B3A5C]">{report.pageSummary}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#F8FAFB] p-3">
          <p className="text-[10px] text-[#8BA3BF]">设备编号</p>
          <p className="font-mono text-sm font-bold text-[#1B3A5C]">{report.equipmentId}</p>
        </div>
        <div className="rounded-lg bg-[#F8FAFB] p-3">
          <p className="text-[10px] text-[#8BA3BF]">张力值</p>
          <p className="font-mono text-sm font-bold text-[#1B3A5C]">{report.tensionValue.toFixed(2)} kN</p>
        </div>
        <div className="rounded-lg bg-[#F8FAFB] p-3">
          <p className="text-[10px] text-[#8BA3BF]">边界判定</p>
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${boundaryColor}`}>
            {BOUNDARY_STATUS_LABELS[report.boundaryStatus]}
          </span>
        </div>
        <div className="rounded-lg bg-[#F8FAFB] p-3">
          <p className="text-[10px] text-[#8BA3BF]">处理状态</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-xs font-medium text-[#1B3A5C]">{REPORT_STATUS_LABELS[report.status]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
