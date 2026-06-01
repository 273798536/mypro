import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAnomalyStore, type Anomaly } from '@/stores/anomalyStore'
import AnomalyTypeBadge from '@/components/AnomalyTypeBadge'

export default function AnomalySection() {
  const { id } = useParams<{ id: string }>()
  const { anomalies, fetchAnomalies, updateAnomaly, resolveAnomaly } = useAnomalyStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const [zeroCorrectionSpec, setZeroCorrectionSpec] = useState('')

  useEffect(() => {
    if (id) fetchAnomalies({ batchId: id })
  }, [id, fetchAnomalies])

  const batchAnomalies = anomalies.filter((a) => a.batchId === id)

  const handleResolve = async (anomaly: Anomaly) => {
    await updateAnomaly(anomaly.id, { resolution, zeroCorrectionSpec })
    await resolveAnomaly(anomaly.id)
    setExpandedId(null)
    setResolution('')
    setZeroCorrectionSpec('')
  }

  if (batchAnomalies.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-100">异常记录</h2>
      <div className="space-y-3">
        {batchAnomalies.map((anomaly) => {
          const isExpanded = expandedId === anomaly.id
          return (
            <div key={anomaly.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <AnomalyTypeBadge type={anomaly.type} />
                <span className="text-sm text-slate-300 flex-1">{anomaly.triggerSource}</span>
                <span className="text-xs text-slate-500">卡在: {anomaly.stuckStep}</span>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                  <div className="text-sm text-slate-400">
                    <span className="text-slate-300 font-medium">下一步: </span>
                    {anomaly.nextAction}
                  </div>
                  {anomaly.status !== 'resolved' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">处理说明</label>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">零点修正规格</label>
                        <textarea
                          value={zeroCorrectionSpec}
                          onChange={(e) => setZeroCorrectionSpec(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        onClick={() => handleResolve(anomaly)}
                        className="px-4 py-1.5 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                      >
                        标记已解决
                      </button>
                    </div>
                  )}
                  {anomaly.status === 'resolved' && (
                    <div className="text-sm text-emerald-400">已解决 {anomaly.resolvedAt && `— ${anomaly.resolvedAt}`}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
