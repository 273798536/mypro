import { useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { Sample, DataSourcing } from '@/types'
import { cn } from '@/lib/utils'

const sourcingBadge: Record<DataSourcing, { label: string; cls: string }> = {
  old_table: { label: '旧表', cls: 'bg-blue-100 text-blue-700' },
  group_supplement: { label: '群补充', cls: 'bg-teal-100 text-teal-700' },
  merged: { label: '合并', cls: 'bg-purple-100 text-purple-700' },
}

interface SampleTableProps {
  samples: Sample[]
  highlightedSampleId: string | null
  onRowClick: (sampleId: string) => void
}

function MissingCell() {
  return (
    <span className="inline-block rounded bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
      缺失
    </span>
  )
}

export default function SampleTable({ samples, highlightedSampleId, onRowClick }: SampleTableProps) {
  const highlightRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedSampleId])

  return (
    <div className="max-h-[460px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-600">样本编号</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">测序结果</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">采样地点</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">时间点</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">数据来源</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">聚类</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">异常标记</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => {
            const isHighlighted = sample.id === highlightedSampleId
            const badge = sourcingBadge[sample.dataSourcing]
            return (
              <tr
                key={sample.id}
                ref={isHighlighted ? highlightRef : undefined}
                onClick={() => onRowClick(sample.id)}
                className={cn(
                  'cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50',
                  sample.isAnomaly && 'border-l-4 border-l-amber-400 bg-amber-50/50',
                  !sample.isAnomaly && 'even:bg-slate-50',
                  isHighlighted && 'ring-2 ring-inset ring-teal-500 bg-teal-50'
                )}
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{sample.sampleName}</td>
                <td className="px-3 py-2 text-slate-700">{sample.sequencingResult}</td>
                <td className="px-3 py-2">
                  {sample.samplingLocation ? (
                    <span className="text-slate-700">{sample.samplingLocation}</span>
                  ) : (
                    <MissingCell />
                  )}
                </td>
                <td className="px-3 py-2">
                  {sample.timepoint ? (
                    <span className="text-slate-700">{sample.timepoint}</span>
                  ) : (
                    <MissingCell />
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', badge.cls)}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{sample.clusterId}</td>
                <td className="px-3 py-2">
                  {sample.isAnomaly ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      异常
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
