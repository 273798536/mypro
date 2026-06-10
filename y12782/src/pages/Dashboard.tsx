import { useLabStore } from '../store'
import { useNavigate, Link } from 'react-router-dom'
import { anomalyTypeLabel, severityLabel, operationLabel } from '../utils/report'

export default function Dashboard() {
  const batches = useLabStore((s) => s.batches)
  const anomalies = useLabStore((s) => s.anomalies)
  const spectrums = useLabStore((s) => s.spectrums)
  const processes = useLabStore((s) => s.processes)
  const navigate = useNavigate()

  const totalBatches = batches.length
  const auditedBatches = batches.filter((b) => b.status === 'audited').length
  const openAnomalies = anomalies.filter((a) => a.status !== 'closed')
  const overlapSpectrums = spectrums.filter((s) => s.hasOverlap).length
  const recentProcesses = processes
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)

  const today = new Date().toISOString().slice(0, 10)
  const expiringSoon = batches.filter((b) => {
    if (b.status === 'expired' || b.status === 'invalid') return false
    const diff = new Date(b.validUntilDate).getTime() - new Date(today).getTime()
    return diff > 0 && diff < 7 * 86400000
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">总览面板</h2>
        <button onClick={() => navigate('/batches/new')} className="btn-primary">
          + 新建批次
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="page-card">
          <div className="text-3xl font-bold text-lab-primary">{totalBatches}</div>
          <div className="text-sm text-slate-500 mt-1">标准液批次</div>
          <div className="text-xs text-slate-400 mt-1">已复核 {auditedBatches} 个</div>
        </div>
        <div className="page-card">
          <div className="text-3xl font-bold text-lab-secondary">{spectrums.length}</div>
          <div className="text-sm text-slate-500 mt-1">谱图检测记录</div>
          <div className="text-xs text-slate-400 mt-1">谱峰重叠 {overlapSpectrums} 次</div>
        </div>
        <div className="page-card">
          <div className={`text-3xl font-bold ${openAnomalies.length > 0 ? 'text-lab-warn' : 'text-lab-success'}`}>
            {openAnomalies.length}
          </div>
          <div className="text-sm text-slate-500 mt-1">未关闭异常</div>
          <div className="text-xs text-slate-400 mt-1">共 {anomalies.length} 条异常</div>
        </div>
        <div className="page-card">
          <div className={`text-3xl font-bold ${expiringSoon.length > 0 ? 'text-lab-danger' : 'text-lab-success'}`}>
            {expiringSoon.length}
          </div>
          <div className="text-sm text-slate-500 mt-1">7天内到期</div>
          <div className="text-xs text-slate-400 mt-1">请及时处理</div>
        </div>
      </div>

      {openAnomalies.length > 0 && (
        <div className="page-card border-l-4 border-lab-warn">
          <h3 className="font-semibold text-slate-800 mb-3">待处理异常</h3>
          <div className="space-y-2">
            {openAnomalies.map((a) => (
              <Link
                key={a.id}
                to={`/anomalies/${a.id}`}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`tag ${a.severity === 'high' ? 'tag-danger' : a.severity === 'medium' ? 'tag-warn' : 'tag-info'}`}>
                    {severityLabel(a.severity)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{a.title}</span>
                  <span className="tag-neutral">{anomalyTypeLabel(a.anomalyType)}</span>
                </div>
                <span className="text-xs text-slate-400">{a.reportedAt}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="page-card border-l-4 border-lab-danger">
          <h3 className="font-semibold text-slate-800 mb-3">即将到期</h3>
          <div className="space-y-2">
            {expiringSoon.map((b) => (
              <Link
                key={b.id}
                to={`/batches/${b.id}`}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-slate-700">{b.batchNo}</span>
                  <span className="text-sm text-slate-500 ml-2">{b.reagentName}</span>
                </div>
                <span className="text-sm text-red-600 font-medium">有效期至 {b.validUntilDate}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="page-card">
        <h3 className="font-semibold text-slate-800 mb-3">最近操作记录（界面/报告共用）</h3>
        <div className="space-y-2">
          {recentProcesses.map((p) => (
            <div key={p.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-400 shrink-0 w-36">{p.createdAt}</span>
              <span className="text-slate-700 font-medium shrink-0">{p.operator}</span>
              <span className="tag-info shrink-0">{operationLabel(p.operationType)}</span>
              <span className="text-slate-600 flex-1">{p.description}</span>
              {p.safetyHint && (
                <span className="tag-warn shrink-0">安全提示</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
