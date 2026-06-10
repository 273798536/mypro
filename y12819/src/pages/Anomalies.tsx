import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Check, EyeOff, ArrowUpCircle } from 'lucide-react'
import { useAppStore } from '@/store'
import type { Anomaly, AnomalyTab } from '@/store'

const TABS: { key: AnomalyTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'batch_mismatch', label: '批号不匹配' },
  { key: 'boundary_unclear', label: '标注边界不清' },
  { key: 'data_missing', label: '数据缺失' },
]

const SUGGESTION_STYLE = {
  batch_mismatch: { border: 'border-l-amber-400', bg: 'bg-amber-50', title: '建议修改口径' },
  boundary_unclear: { border: 'border-l-red-400', bg: 'bg-red-50', title: '建议补充材料' },
  data_missing: { border: 'border-l-sky-400', bg: 'bg-sky-50', title: '建议重新采样' },
}

const STATUS_BADGE = {
  pending: { label: '待处理', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: '已处理', color: 'bg-emerald-100 text-emerald-700' },
  ignored: { label: '已忽略', color: 'bg-slate-100 text-slate-500' },
  escalated: { label: '已升级', color: 'bg-red-100 text-red-700' },
}

export default function Anomalies() {
  const { anomalies, selectedAnomalyTab, fetchAnomalies, updateAnomaly, setSelectedAnomalyTab, fetchAnomalySummary } = useAppStore()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const loadAnomalies = useCallback(() => {
    const params: Record<string, string> = {}
    if (selectedAnomalyTab !== 'all') params.type = selectedAnomalyTab
    fetchAnomalies(params)
  }, [selectedAnomalyTab, fetchAnomalies])

  useEffect(() => {
    loadAnomalies()
  }, [loadAnomalies])

  const toggleExpand = (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const handleAction = async (anomaly: Anomaly, status: string) => {
    await updateAnomaly(anomaly.id, { status })
    fetchAnomalySummary()
  }

  return (
    <div className="space-y-6">
      <h2 className="font-title text-2xl font-semibold text-slate-800">异常复核</h2>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedAnomalyTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedAnomalyTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {anomalies.map((a) => {
          const isOpen = expanded.has(a.id)
          const style = SUGGESTION_STYLE[a.type as keyof typeof SUGGESTION_STYLE] || SUGGESTION_STYLE.batch_mismatch
          const badge = STATUS_BADGE[a.status as keyof typeof STATUS_BADGE] || STATUS_BADGE.pending

          return (
            <div key={a.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(a.id)}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown size={18} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight size={18} className="text-slate-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {a.animal_id || `记录#${a.record_id}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{a.description}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{a.experiment_group}</span>
              </button>

              {isOpen && (
                <div className="px-6 pb-5 space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">问题描述：</span>
                      {a.description}
                    </p>
                  </div>

                  <div className={`${style.border} border-l-4 ${style.bg} rounded-r-lg p-4`}>
                    <p className="font-medium text-slate-800 mb-2">{style.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{a.suggestion_detail}</p>
                  </div>

                  <div className="flex gap-2">
                    {a.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(a, 'resolved')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
                        >
                          <Check size={14} />
                          标记已处理
                        </button>
                        <button
                          onClick={() => handleAction(a, 'ignored')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300 transition-colors"
                        >
                          <EyeOff size={14} />
                          忽略
                        </button>
                        <button
                          onClick={() => handleAction(a, 'escalated')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          <ArrowUpCircle size={14} />
                          需升级
                        </button>
                      </>
                    )}
                    {a.status !== 'pending' && (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400">
                    创建于 {a.created_at}
                    {a.resolved_at && ` · 处理于 ${a.resolved_at}`}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {anomalies.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400">
            当前筛选条件下暂无异常记录
          </div>
        )}
      </div>
    </div>
  )
}
