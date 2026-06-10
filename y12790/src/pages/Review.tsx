import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { GRADE_LABELS } from '@/utils/analysis'
import StatusBadge from '@/components/StatusBadge'
import CompletenessRing from '@/components/CompletenessRing'
import type { AnomalyEntry } from '@/types'
import { Clock, AlertTriangle, XCircle, Info, ExternalLink } from 'lucide-react'

type FilterTab = 'all' | 'usable' | 'review' | 'bad'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'usable', label: '可直接用' },
  { key: 'review', label: '需复核' },
  { key: 'bad', label: '数据坏' },
]

function SeverityIcon({ severity }: { severity: AnomalyEntry['severity'] }) {
  if (severity === 'high') return <XCircle className="h-4 w-4 text-red-500" />
  if (severity === 'medium') return <AlertTriangle className="h-4 w-4 text-amber-500" />
  return <Info className="h-4 w-4 text-blue-500" />
}

const SEVERITY_LABEL: Record<AnomalyEntry['severity'], string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function Review() {
  const records = useStore((s) => s.records)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filtered = activeTab === 'all'
    ? records
    : records.filter((r) => r.status === activeTab)

  const allAnomalies = records.flatMap((r) =>
    r.anomalies.map((a) => ({ ...a, sampleCode: r.sampleCode, recordId: r.id })),
  )

  const groupedAnomalies = allAnomalies.reduce<
    Record<string, (AnomalyEntry & { sampleCode: string; recordId: string })[]>
  >((acc, a) => {
    ;(acc[a.recordId] ??= []).push(a)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-['Noto_Serif_SC'] text-2xl font-bold text-slate-800">复核与分级</h1>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((record) => {
          const keyAnomalies = record.anomalies.filter((a) => a.severity !== 'low').slice(0, 3)
          return (
            <div
              key={record.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CompletenessRing score={record.completenessScore} size={44} strokeWidth={3} />
                  <div>
                    <div className="font-semibold text-slate-800">{record.sampleCode}</div>
                    <StatusBadge grade={record.status} />
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {record.anomalies.length} 异常
                </span>
              </div>

              {keyAnomalies.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {keyAnomalies.map((a) => (
                    <div key={a.id} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <SeverityIcon severity={a.severity} />
                      <span>{a.description}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <Link
                  to={`/records/${record.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800"
                >
                  查看详情 <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">异常留痕汇总</h2>
        {Object.keys(groupedAnomalies).length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">暂无异常记录</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAnomalies).map(([recordId, anomalies]) => {
              const sampleCode = anomalies[0].sampleCode
              return (
                <div key={recordId}>
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <Link
                      to={`/records/${recordId}`}
                      className="text-sm font-medium text-amber-600 hover:text-amber-800"
                    >
                      {sampleCode}
                    </Link>
                  </div>
                  <div className="ml-6 space-y-2 border-l-2 border-slate-100 pl-4">
                    {anomalies.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <SeverityIcon severity={a.severity} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                a.severity === 'high' && 'bg-red-100 text-red-700',
                                a.severity === 'medium' && 'bg-amber-100 text-amber-700',
                                a.severity === 'low' && 'bg-blue-100 text-blue-700',
                              )}
                            >
                              {SEVERITY_LABEL[a.severity]}
                            </span>
                            <span className="text-xs text-slate-500">{a.anomalyType}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-700">{a.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
