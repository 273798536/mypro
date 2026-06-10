import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLabStore } from '../store'
import { anomalyTypeLabel, severityLabel, operationLabel } from '../utils/report'

export default function AnomalyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getAnomaly = useLabStore((s) => s.getAnomalyById)
  const getBatch = useLabStore((s) => s.getBatchById)
  const getSpectrum = useLabStore((s) => s.getSpectrumById)
  const getTraceChain = useLabStore((s) => s.getTraceChain)
  const handleAnomaly = useLabStore((s) => s.handleAnomaly)

  const anomaly = getAnomaly(id!)
  if (!anomaly) {
    return (
      <div className="page-card text-center py-12">
        <p className="text-slate-400">异常记录不存在</p>
        <Link to="/anomalies" className="btn-primary mt-4 inline-block">返回列表</Link>
      </div>
    )
  }

  const batch = getBatch(anomaly.batchId)
  const spectrum = anomaly.relatedSpectrumId ? getSpectrum(anomaly.relatedSpectrumId) : undefined
  const trace = getTraceChain(anomaly.id)

  const onHandle = () => {
    const handler = prompt('请输入处理人姓名')
    if (!handler) return
    const opinion = prompt('请输入处理意见')
    if (!opinion) return
    const safetyHint = prompt('是否有补充安全提示？没有则留空')
    handleAnomaly(anomaly.id, handler, opinion, safetyHint || undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/anomalies')} className="btn-ghost text-sm">← 返回</button>
        <h2 className="text-2xl font-bold text-slate-800">异常详情</h2>
        <span className={`tag ${anomaly.severity === 'high' ? 'tag-danger' : anomaly.severity === 'medium' ? 'tag-warn' : 'tag-info'}`}>
          {severityLabel(anomaly.severity)}
        </span>
        <span className="tag-neutral">{anomalyTypeLabel(anomaly.anomalyType)}</span>
        <span className={
          anomaly.status === 'open' ? 'tag-warn' :
          anomaly.status === 'handling' ? 'tag-info' :
          anomaly.status === 'resolved' ? 'tag-success' : 'tag-neutral'
        }>
          {anomaly.status === 'open' ? '待处理' : anomaly.status === 'handling' ? '处理中' : anomaly.status === 'resolved' ? '已解决' : '已关闭'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="page-card">
          <h3 className="font-semibold text-slate-800 mb-4">异常信息</h3>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-slate-500">标题</dt><dd className="font-medium text-slate-800">{anomaly.title}</dd></div>
            <div><dt className="text-slate-500">详细描述</dt><dd className="text-slate-700">{anomaly.detail}</dd></div>
            <div>
              <dt className="text-slate-500">安全提示</dt>
              <dd className="text-amber-800 bg-amber-50 p-3 rounded-lg mt-1">{anomaly.safetyHint}</dd>
            </div>
            <div><dt className="text-slate-500">报告人</dt><dd className="text-slate-700">{anomaly.reporter}</dd></div>
            <div><dt className="text-slate-500">报告时间</dt><dd className="text-slate-700">{anomaly.reportedAt}</dd></div>
            {anomaly.handler && <div><dt className="text-slate-500">处理人</dt><dd className="text-slate-700">{anomaly.handler}</dd></div>}
            {anomaly.handlingOpinion && (
              <div>
                <dt className="text-slate-500">处理意见</dt>
                <dd className="text-green-800 bg-green-50 p-3 rounded-lg mt-1">{anomaly.handlingOpinion}</dd>
              </div>
            )}
          </dl>
          {anomaly.status === 'open' || anomaly.status === 'handling' ? (
            <button onClick={onHandle} className="btn-success mt-4">处理异常</button>
          ) : null}
        </div>

        <div className="page-card">
          <h3 className="font-semibold text-slate-800 mb-4">通俗解释（可直接复制给同事）</h3>
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-slate-800 leading-relaxed">
            {anomaly.plainLanguageExplanation}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(anomaly.plainLanguageExplanation)}
            className="btn-ghost mt-3 text-sm"
          >
            复制到剪贴板
          </button>
        </div>
      </div>

      <div className="page-card">
        <h3 className="font-semibold text-slate-800 mb-4">追溯链：异常 → 实验记录 → 处理意见</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs shrink-0">1</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">异常记录</div>
              <div className="text-sm text-slate-600 mt-1">
                <Link to={`/anomalies/${anomaly.id}`} className="text-lab-primary hover:underline">{anomaly.title}</Link>
                <span className="ml-2 text-slate-400">| {anomaly.reporter} | {anomaly.reportedAt}</span>
              </div>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-slate-200 h-4"></div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">2</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">关联实验记录</div>
              {spectrum ? (
                <div className="text-sm text-slate-600 mt-1">
                  <Link to={`/batches/${batch?.id}`} className="text-lab-primary hover:underline">
                    {spectrum.analysisDate} · {spectrum.instrumentName} ({spectrum.instrumentNo})
                  </Link>
                  <span className="ml-2 text-slate-400">| 分析人：{spectrum.analyst}</span>
                  <span className={`ml-2 ${spectrum.conclusion === 'qualified' ? 'text-green-600' : 'text-red-600'}`}>
                    结论：{spectrum.conclusion === 'qualified' ? '合格' : spectrum.conclusion === 'unqualified' ? '不合格' : '待判定'}
                  </span>
                  {spectrum.hasOverlap && (
                    <div className="mt-1 text-xs text-red-600">
                      谱峰重叠：{spectrum.overlapDetails.join('；')}
                    </div>
                  )}
                </div>
              ) : batch ? (
                <div className="text-sm text-slate-600 mt-1">
                  <Link to={`/batches/${batch.id}`} className="text-lab-primary hover:underline">
                    {batch.batchNo} · {batch.reagentName}
                  </Link>
                  <span className="ml-2 text-slate-400">（无关联谱图）</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400">批次信息不存在</div>
              )}
            </div>
          </div>
          <div className="ml-4 border-l-2 border-slate-200 h-4"></div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs shrink-0">3</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">处理意见</div>
              {anomaly.handlingOpinion ? (
                <div className="text-sm text-slate-600 mt-1">
                  <span className="text-slate-700">{anomaly.handlingOpinion}</span>
                  <span className="ml-2 text-slate-400">| {anomaly.handler} | {anomaly.handledAt}</span>
                </div>
              ) : (
                <div className="text-sm text-amber-600 mt-1">尚未处理</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-card">
        <h3 className="font-semibold text-slate-800 mb-4">关联批处理记录（异常留痕与安全提示统一）</h3>
        <div className="space-y-1">
          {trace.processes
            .filter((p) => anomaly.processRecordIds.includes(p.id) || p.relatedAnomalyId === anomaly.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((p) => (
              <div key={p.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-400 shrink-0 w-36">{p.createdAt}</span>
                <span className="text-slate-700 font-medium shrink-0 w-16">{p.operator}</span>
                <span className="tag-info shrink-0">{operationLabel(p.operationType)}</span>
                <span className="text-slate-600 flex-1">{p.description}</span>
                {p.safetyHint && (
                  <span className="text-xs text-amber-700 shrink-0" title={p.safetyHint}>⚡安全提示</span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
