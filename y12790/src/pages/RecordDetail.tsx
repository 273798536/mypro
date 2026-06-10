import { useParams, Link } from 'react-router-dom'
import { useStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import CompletenessRing from '@/components/CompletenessRing'
import AnomalyTimeline from '@/components/AnomalyTimeline'
import { detectMixedNotes } from '@/utils/analysis'
import { cn } from '@/lib/utils'
import { ArrowRight, Thermometer, Beaker, Clock } from 'lucide-react'

interface FieldDef {
  key: string
  label: string
  value: string | null
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const record = useStore((s) => s.records.find((r) => r.id === id))

  if (!record) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <p className="text-gray-500">未找到记录</p>
        <Link to="/" className="mt-2 inline-block text-indigo-600 hover:underline">返回首页</Link>
      </div>
    )
  }

  const fields: FieldDef[] = [
    { key: 'sampleCode', label: '样品编号', value: record.sampleCode },
    { key: 'extractionMethod', label: '浸提方法', value: record.extractionMethod },
    { key: 'temperature', label: '温度', value: record.temperature !== null ? `${record.temperature}℃` : null },
    { key: 'ph', label: 'pH', value: record.ph !== null ? `${record.ph}` : null },
    { key: 'duration', label: '持续时间', value: record.duration !== null ? `${record.duration}min` : null },
    { key: 'operator', label: '实验员', value: record.operator },
    { key: 'notes', label: '备注', value: record.notes },
  ]

  const mixedParts = detectMixedNotes(record.notes)
  const rc = record.reactionCondition

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{record.sampleCode}</h1>
          <StatusBadge grade={record.status} size="md" />
        </div>
        <Link
          to={`/analysis/${record.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          进入分析
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-medium text-gray-500">字段信息</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key}>
                  <p className="text-xs text-gray-400">{field.label}</p>
                  {field.value === null ? (
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="inline-block rounded border-2 border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-500 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                        字段缺失
                      </span>
                    </div>
                  ) : field.key === 'notes' && mixedParts.length > 0 ? (
                    <div className="mt-0.5 space-y-1">
                      {record.notes!.split(/[;；,，\n]/).map((part, i) => {
                        const trimmed = part.trim()
                        if (!trimmed) return null
                        const isMixed = mixedParts.some((mp) => mp.includes(trimmed) || trimmed.includes(mp))
                        return (
                          <span
                            key={i}
                            className={cn(
                              'mr-1 inline-block rounded px-2 py-0.5 text-sm',
                              isMixed
                                ? 'border border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                : 'text-gray-900 dark:text-gray-100',
                            )}
                          >
                            {isMixed && <span className="mr-1 text-xs font-medium text-blue-500">备注混写</span>}
                            {trimmed}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{field.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-medium text-gray-500">反应条件</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/20">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500">目标温度</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rc.targetTemp}℃</p>
                  <p className="text-xs text-gray-400">范围 {rc.tempLowerLimit}–{rc.tempUpperLimit}℃</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-violet-50 px-3 py-2 dark:bg-violet-900/20">
                <Beaker className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-gray-500">目标pH</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rc.targetPH}</p>
                  <p className="text-xs text-gray-400">范围 {rc.phLowerLimit}–{rc.phUpperLimit}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-cyan-50 px-3 py-2 dark:bg-cyan-900/20">
                <Clock className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-xs text-gray-500">持续时间</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rc.targetDuration}min</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-medium text-gray-500">异常记录</h2>
            <AnomalyTimeline anomalies={record.anomalies} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <CompletenessRing score={record.completenessScore} size={96} strokeWidth={6} />
          <p className="text-xs text-gray-500">完整度</p>
        </div>
      </div>
    </div>
  )
}
