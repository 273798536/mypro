import { useState } from 'react'
import { FileDown, Check, X, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { GRADE_LABELS } from '@/utils/analysis'
import StatusBadge from '@/components/StatusBadge'
import type { ConclusionGrade } from '@/types'
import { cn } from '@/lib/utils'

export default function Export() {
  const { records, getExportDiffs } = useStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(records.map((r) => r.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const selectedRecords = records.filter((r) => selectedIds.has(r.id))

  const gradeSummary: Record<ConclusionGrade, number> = { usable: 0, review: 0, bad: 0 }
  selectedRecords.forEach((r) => {
    gradeSummary[r.status]++
  })

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(selectedRecords, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soil-heavy-metal-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="font-['Noto_Serif_SC'] text-2xl font-bold text-slate-800">报告导出</h1>
        <p className="mt-1 text-sm text-slate-500">选择实验记录，预览并导出土壤重金属浸提报告</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">选择记录</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200"
            >
              全选
            </button>
            <button
              onClick={deselectAll}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200"
            >
              取消全选
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">暂无记录</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <label
                key={record.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-2 py-3 transition-colors hover:bg-slate-50',
                  selectedIds.has(record.id) && 'bg-amber-50/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => toggleSelect(record.id)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <span className="font-mono text-sm font-medium text-slate-900">{record.sampleCode}</span>
                <StatusBadge grade={record.status} />
                <span className="text-sm text-slate-500">{record.extractionMethod ?? '—'}</span>
                <span className="ml-auto text-sm text-slate-400">
                  完整性 {record.completenessScore}%
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {selectedRecords.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">导出对账</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">样品编号</th>
                  <th className="px-3 py-2 font-medium">字段</th>
                  <th className="px-3 py-2 font-medium">录入值</th>
                  <th className="px-3 py-2 font-medium">计算值</th>
                  <th className="px-3 py-2 font-medium">是否一致</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecords.map((record) => {
                  const diffs = getExportDiffs(record.id)
                  return diffs.map((diff, i) => (
                    <tr
                      key={`${record.id}-${i}`}
                      className={cn('border-b border-slate-100', !diff.isMatch && 'bg-red-50')}
                    >
                      <td className="px-3 py-2 font-mono text-slate-900">
                        {i === 0 ? record.sampleCode : ''}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{diff.field}</td>
                      <td className="px-3 py-2 text-slate-700">{diff.recordedValue}</td>
                      <td className="px-3 py-2 text-slate-700">{diff.calculatedValue}</td>
                      <td className="px-3 py-2">
                        {diff.isMatch ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedRecords.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">报告预览</h2>
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-6 space-y-6">
            <div className="space-y-1 text-center">
              <h3 className="font-['Noto_Serif_SC'] text-xl font-bold text-slate-900">土壤重金属浸提报告</h3>
              <p className="text-sm text-slate-500">
                生成日期：{new Date().toLocaleDateString('zh-CN')}
              </p>
            </div>

            <div className="space-y-4">
              {selectedRecords.map((record) => {
                const gradeInfo = GRADE_LABELS[record.status]
                return (
                  <div key={record.id} className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">{record.sampleCode}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          record.status === 'usable' && 'bg-emerald-100 text-emerald-700',
                          record.status === 'review' && 'bg-amber-100 text-amber-700',
                          record.status === 'bad' && 'bg-red-100 text-red-700',
                        )}
                      >
                        {gradeInfo.icon} {gradeInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-slate-500">浸提方法：</span>
                        <span className="text-slate-900">{record.extractionMethod ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">温度：</span>
                        <span className="text-slate-900">{record.temperature !== null ? `${record.temperature}℃` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">pH：</span>
                        <span className="text-slate-900">{record.ph !== null ? `${record.ph}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">时长：</span>
                        <span className="text-slate-900">{record.duration !== null ? `${record.duration}min` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">操作员：</span>
                        <span className="text-slate-900">{record.operator ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">完整性：</span>
                        <span className="text-slate-900">{record.completenessScore}%</span>
                      </div>
                    </div>

                    {record.anomalies.length > 0 && (
                      <div className="border-t border-slate-100 pt-2">
                        <p className="mb-1 text-xs font-medium text-slate-500">异常摘要</p>
                        <ul className="space-y-0.5">
                          {record.anomalies.map((a) => (
                            <li key={a.id} className="text-xs text-slate-600">
                              {a.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-300 pt-4 text-center text-sm text-slate-600">
              {GRADE_LABELS.usable.icon} {gradeSummary.usable}条可直接用，{GRADE_LABELS.review.icon} {gradeSummary.review}条需复核，{GRADE_LABELS.bad.icon} {gradeSummary.bad}条数据坏
            </div>
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={selectedRecords.length === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
            selectedRecords.length > 0
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'cursor-not-allowed bg-slate-200 text-slate-400',
          )}
        >
          <FileDown className="h-4 w-4" />
          导出报告
        </button>
      </div>
    </div>
  )
}
