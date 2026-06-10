import { useLabStore } from '../store'
import { Link } from 'react-router-dom'
import { anomalyTypeLabel, severityLabel } from '../utils/report'

export default function AnomalyList() {
  const anomalies = useLabStore((s) => s.anomalies)
  const getBatch = useLabStore((s) => s.getBatchById)

  const sorted = [...anomalies].sort((a, b) => {
    const order = { open: 0, handling: 1, resolved: 2, closed: 3 }
    return order[a.status] - order[b.status] || b.reportedAt.localeCompare(a.reportedAt)
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">异常记录</h2>

      <div className="page-card">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无异常记录</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((a) => {
              const batch = getBatch(a.batchId)
              return (
                <Link
                  key={a.id}
                  to={`/anomalies/${a.id}`}
                  className="block p-4 rounded-lg border border-slate-200 hover:border-lab-secondary hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`tag ${a.severity === 'high' ? 'tag-danger' : a.severity === 'medium' ? 'tag-warn' : 'tag-info'}`}>
                        {severityLabel(a.severity)}
                      </span>
                      <span className="tag-neutral">{anomalyTypeLabel(a.anomalyType)}</span>
                      <span className="text-sm font-medium text-slate-700">{a.title}</span>
                    </div>
                    <span className={
                      a.status === 'open' ? 'tag-warn' :
                      a.status === 'handling' ? 'tag-info' :
                      a.status === 'resolved' ? 'tag-success' : 'tag-neutral'
                    }>
                      {a.status === 'open' ? '待处理' : a.status === 'handling' ? '处理中' : a.status === 'resolved' ? '已解决' : '已关闭'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      批次：{batch?.batchNo || a.batchId} · {batch?.reagentName}
                    </span>
                    <span>报告人：{a.reporter} · {a.reportedAt}</span>
                  </div>
                  {a.safetyHint && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                      <span className="font-semibold">安全提示：</span>{a.safetyHint}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
