import { Candidate, ReagentBatch } from '@/types'

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-zinc-100 text-zinc-700' },
  anomaly: { label: '异常', className: 'bg-orange-100 text-orange-700' },
  approved: { label: '已复核', className: 'bg-teal-100 text-teal-700' },
}

const negControlConfig: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-zinc-100 text-zinc-600' },
  abnormal: { label: '异常', className: 'bg-red-50 text-red-600' },
  pending: { label: '待定', className: 'bg-amber-50 text-amber-600' },
}

interface CandidateTableProps {
  candidates: Candidate[]
  reagentBatches: ReagentBatch[]
  onRowClick: (id: string) => void
}

export default function CandidateTable({ candidates, reagentBatches, onRowClick }: CandidateTableProps) {
  const getBatch = (id: string) => reagentBatches.find((b) => b.id === id)

  if (candidates.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-400">
        <p className="text-lg">暂无匹配的脱靶候选记录</p>
        <p className="text-sm mt-2">请调整筛选条件</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-100 text-left">
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">样本ID</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">靶点位置</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">脱靶位点</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">错配数</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">链</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">试剂批号</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">阴性对照</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">状态</th>
            <th className="px-4 py-3 font-medium text-zinc-600 whitespace-nowrap">处理意见</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const batch = getBatch(c.reagentBatchId)
            const isAnomaly = c.status === 'anomaly'
            return (
              <tr
                key={c.id}
                onClick={() => onRowClick(c.id)}
                className={`border-b border-zinc-100 cursor-pointer transition-colors hover:bg-teal-50/50 ${
                  isAnomaly ? 'border-l-[3px] border-l-orange-400' : ''
                } ${c.status === 'approved' ? 'border-l-[3px] border-l-teal-500' : ''}`}
              >
                <td className="px-4 py-3 font-mono-data text-xs">{c.sampleId}</td>
                <td className="px-4 py-3 font-mono-data text-xs">{c.targetSite}</td>
                <td className="px-4 py-3 font-mono-data text-xs">{c.offTargetSite}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block min-w-[24px] text-center rounded px-1.5 py-0.5 text-xs font-medium ${
                    c.mismatchCount >= 4 ? 'bg-red-50 text-red-600' : c.mismatchCount >= 3 ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {c.mismatchCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono-data text-xs">{c.strand}</td>
                <td className="px-4 py-3">
                  <span className="font-mono-data text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {batch?.batchNo || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${negControlConfig[c.negControlResult]?.className || ''}`}>
                    {negControlConfig[c.negControlResult]?.label || c.negControlResult}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${statusConfig[c.status]?.className || ''}`}>
                    {statusConfig[c.status]?.label || c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 max-w-[200px] truncate" title={c.processingOpinion}>
                  {c.processingOpinion}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
