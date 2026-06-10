import { ArrowRight } from 'lucide-react'
import type { Sample, DataConflict } from '@/types'

const sourcingLabels: Record<Sample['dataSourcing'], { label: string; className: string }> = {
  old_table: { label: '旧表', className: 'bg-slate-100 text-slate-600' },
  group_supplement: { label: '群补充', className: 'bg-teal-50 text-teal-700' },
  merged: { label: '已合并', className: 'bg-teal-100 text-teal-800' },
}

const fieldLabels: Record<string, string> = {
  timepoint: '时间点',
  samplingLocation: '采样地点',
  platform: '测序平台',
  depthValue: '测序深度',
}

interface DataMergePanelProps {
  samples: Sample[]
  conflicts: DataConflict[]
  onMerge: () => void
}

export default function DataMergePanel({ samples, conflicts, onMerge }: DataMergePanelProps) {
  const oldTableSamples = samples.filter(s => s.dataSourcing === 'old_table')
  const groupSupplementSamples = samples.filter(s => s.dataSourcing === 'group_supplement')
  const mergedSamples = samples.filter(s => s.dataSourcing === 'merged')
  const conflictIds = new Set(conflicts.map(c => c.sampleId))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-800">数据合并</h2>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-600">旧表测序结果</h3>
          <div className="space-y-2">
            {oldTableSamples.map(sample => (
              <div
                key={sample.id}
                className={`rounded-lg border p-3 text-sm ${
                  conflictIds.has(sample.id) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{sample.sampleName}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${sourcingLabels.old_table.className}`}>
                    {sourcingLabels.old_table.label}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {sample.sequencingResult} · {sample.samplingLocation || '地点缺失'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 px-2">
          {samples.map(sample => {
            const hasConflict = conflictIds.has(sample.id)
            return (
              <div key={sample.id} className="flex flex-col items-center gap-1 py-2">
                <span className={`text-lg ${hasConflict ? 'text-amber-500' : 'text-teal-500'}`}>
                  {hasConflict ? '⚠' : '✓'}
                </span>
                {hasConflict && <span className="text-xs text-amber-600">需人工确认</span>}
              </div>
            )
          })}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-600">群补充采样地点</h3>
          <div className="space-y-2">
            {groupSupplementSamples.map(sample => (
              <div
                key={sample.id}
                className={`rounded-lg border p-3 text-sm ${
                  conflictIds.has(sample.id) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{sample.sampleName}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${sourcingLabels.group_supplement.className}`}>
                    {sourcingLabels.group_supplement.label}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {sample.samplingLocation || '地点缺失'} · {sample.timepoint || '时间点缺失'}
                </div>
              </div>
            ))}
            {mergedSamples.map(sample => (
              <div key={sample.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{sample.sampleName}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${sourcingLabels.merged.className}`}>
                    {sourcingLabels.merged.label}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {sample.samplingLocation || '地点缺失'} · {sample.timepoint || '时间点缺失'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-2 text-sm font-medium text-amber-800">冲突项</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, i) => (
              <div key={`${conflict.sampleId}-${conflict.fieldName}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-amber-700">{conflict.sampleId}</span>
                <span className="text-amber-600">{fieldLabels[conflict.fieldName] || conflict.fieldName}:</span>
                <span className="text-slate-500 line-through">{conflict.oldValue || '（空）'}</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-amber-700">{conflict.newValue}</span>
                {conflict.resolved && <span className="text-xs text-teal-600">已解决</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={onMerge}
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          执行合并
        </button>
      </div>
    </div>
  )
}
