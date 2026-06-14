import { CheckCircle2, FileQuestion, UserCheck, TrendingUp } from 'lucide-react'
import type { TensionReport } from '../types'
import { REPORT_STATUS_LABELS, BOUNDARY_STATUS_LABELS } from '../types'

interface Props {
  report: TensionReport
  onClick?: () => void
}

const STATUS_ICON = {
  processed: CheckCircle2,
  pending_material: FileQuestion,
  manual_override: UserCheck,
}

const STATUS_BORDER = {
  processed: 'border-l-[#2D9B83]',
  pending_material: 'border-l-[#E8A838]',
  manual_override: 'border-l-[#C44D3F]',
}

const BOUNDARY_COLOR = {
  normal: 'text-[#2D9B83] bg-[#2D9B83]/10',
  critical: 'text-[#E8A838] bg-[#E8A838]/10',
  exceeded: 'text-[#C44D3F] bg-[#C44D3F]/10',
}

export default function ReportCard({ report, onClick }: Props) {
  const Icon = STATUS_ICON[report.status]

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-[#1B3A5C]/10 border-l-4 ${STATUS_BORDER[report.status]} bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#5A7A9A]" />
          <span className="font-mono text-sm font-bold text-[#1B3A5C]">{report.equipmentId}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BOUNDARY_COLOR[report.boundaryStatus]}`}>
          {BOUNDARY_STATUS_LABELS[report.boundaryStatus]}
        </span>
      </div>

      <div className="mb-2 flex items-baseline gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-[#8BA3BF]" />
        <span className="font-mono text-lg font-bold text-[#1B3A5C]">{report.tensionValue.toFixed(2)}</span>
        <span className="text-xs text-[#8BA3BF]">kN</span>
      </div>

      <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-[#5A7A9A]">{report.pageSummary}</p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8BA3BF]">
          {new Date(report.createdAt).toLocaleString('zh-CN')}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${REPORT_STATUS_LABELS[report.status] === '已处理' ? 'bg-[#2D9B83]/10 text-[#2D9B83]' : REPORT_STATUS_LABELS[report.status] === '待补材料' ? 'bg-[#E8A838]/10 text-[#E8A838]' : 'bg-[#C44D3F]/10 text-[#C44D3F]'}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
    </div>
  )
}
