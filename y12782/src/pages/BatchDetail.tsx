import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLabStore } from '../store'
import { anomalyTypeLabel, severityLabel, operationLabel } from '../utils/report'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'tag-neutral' },
  prepared: { label: '已配制', cls: 'tag-info' },
  audited: { label: '已复核', cls: 'tag-success' },
  expired: { label: '已过期', cls: 'tag-danger' },
  invalid: { label: '已作废', cls: 'tag-danger' },
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getBatch = useLabStore((s) => s.getBatchById)
  const getSpectrums = useLabStore((s) => s.getSpectrumsByBatchId)
  const getAnomalies = useLabStore((s) => s.getAnomaliesByBatchId)
  const getProcesses = useLabStore((s) => s.getProcessesByBatchId)
  const auditBatch = useLabStore((s) => s.auditBatch)

  const batch = getBatch(id!)
  if (!batch) {
    return (
      <div className="page-card text-center py-12">
        <p className="text-slate-400">批次不存在</p>
        <Link to="/batches" className="btn-primary mt-4 inline-block">返回列表</Link>
      </div>
    )
  }

  const spectrums = getSpectrums(batch.id)
  const anomalies = getAnomalies(batch.id)
  const processes = getProcesses(batch.id)
  const st = statusMap[batch.status] || statusMap.draft

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/batches')} className="btn-ghost text-sm">← 返回</button>
          <h2 className="text-2xl font-bold text-slate-800">{batch.batchNo}</h2>
          <span className={st.cls}>{st.label}</span>
        </div>
        <div className="flex gap-2">
          {batch.status === 'prepared' && (
            <button
              onClick={() => {
                const auditor = prompt('请输入复核人姓名')
                if (auditor) auditBatch(batch.id, auditor)
              }}
              className="btn-success text-sm"
            >
              复核通过
            </button>
          )}
          <Link to={`/reports/${batch.id}`} className="btn-secondary text-sm">查看报告</Link>
          <Link to={`/spectrum/import?batchId=${batch.id}`} className="btn-primary text-sm">导入谱图</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="page-card">
          <h3 className="font-semibold text-slate-800 mb-4">基本信息</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-slate-500">试剂名称</dt><dd className="font-medium text-slate-800">{batch.reagentName}</dd></div>
            <div><dt className="text-slate-500">CAS 编号</dt><dd className="font-medium text-slate-800">{batch.reagentCasNo || '—'}</dd></div>
            <div><dt className="text-slate-500">标称浓度</dt><dd className="font-medium text-slate-800">{batch.nominalConcentration} {batch.nominalConcentrationUnit}</dd></div>
            <div><dt className="text-slate-500">实际浓度</dt><dd className="font-medium text-slate-800">
              {batch.actualConcentration != null ? (
                <span>
                  {batch.actualConcentration} {batch.nominalConcentrationUnit}
                  {(() => {
                    const diff = ((batch.actualConcentration - batch.nominalConcentration) / batch.nominalConcentration * 100).toFixed(2)
                    const n = Number(diff)
                    return (
                      <span className={`ml-2 text-xs ${Math.abs(n) > 5 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                        ({n > 0 ? '+' : ''}{diff}%)
                      </span>
                    )
                  })()}
                </span>
              ) : '—'}
            </dd></div>
            <div><dt className="text-slate-500">配制日期</dt><dd className="font-medium text-slate-800">{batch.preparationDate}</dd></div>
            <div><dt className="text-slate-500">有效期至</dt><dd className="font-medium text-slate-800">{batch.validUntilDate}</dd></div>
            <div><dt className="text-slate-500">配制人</dt><dd className="font-medium text-slate-800">{batch.preparator}</dd></div>
            <div><dt className="text-slate-500">复核人</dt><dd className="font-medium text-slate-800">{batch.auditor || '—'}</dd></div>
          </dl>
          {batch.concentrationErrorCause && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 mb-1">浓度偏差原因（通俗说明）</div>
              <div className="text-sm text-amber-900">{batch.concentrationErrorCause}</div>
            </div>
          )}
          {batch.remark && (
            <div className="mt-3 text-sm text-slate-500">备注：{batch.remark}</div>
          )}
        </div>

        <div className="page-card">
          <h3 className="font-semibold text-slate-800 mb-4">谱图检测 ({spectrums.length})</h3>
          {spectrums.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>暂无谱图数据</p>
              <Link to={`/spectrum/import?batchId=${batch.id}`} className="btn-secondary mt-3 inline-block text-sm">导入谱图</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {spectrums.map((spec) => (
                <div key={spec.id} className={`p-4 rounded-lg border ${spec.hasOverlap ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{spec.analysisDate}</span>
                      <span className="text-xs text-slate-500">{spec.instrumentName} ({spec.instrumentNo})</span>
                      <span className="text-xs text-slate-500">分析：{spec.analyst}</span>
                    </div>
                    <span className={spec.conclusion === 'qualified' ? 'tag-success' : spec.conclusion === 'unqualified' ? 'tag-danger' : 'tag-warn'}>
                      {spec.conclusion === 'qualified' ? '合格' : spec.conclusion === 'unqualified' ? '不合格' : '待判定'}
                    </span>
                  </div>
                  {spec.hasOverlap && (
                    <div className="mb-2 p-2 bg-red-100 rounded text-xs text-red-800">
                      <div className="font-semibold mb-1">谱峰重叠警告</div>
                      {spec.overlapDetails.map((d, i) => (
                        <div key={i}>• {d}</div>
                      ))}
                    </div>
                  )}
                  <div className="h-40 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spec.rawData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="rt" tick={{ fontSize: 10 }} label={{ value: '保留时间(min)', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} label={{ value: '信号强度', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [v.toFixed(1), '信号']} labelFormatter={(l) => `RT: ${l} min`} />
                        {spec.peaks.map((pk, i) => (
                          <ReferenceLine key={i} x={pk.retentionTime} stroke={spec.hasOverlap ? '#dc2626' : '#0891b2'} strokeDasharray="4 4" />
                        ))}
                        <Line type="monotone" dataKey="intensity" stroke={spec.hasOverlap ? '#dc2626' : '#1e40af'} dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-card">
        <h3 className="font-semibold text-slate-800 mb-4">异常记录 ({anomalies.length})</h3>
        {anomalies.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm">暂无异常</div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => (
              <Link
                key={a.id}
                to={`/anomalies/${a.id}`}
                className="block p-4 rounded-lg border border-slate-200 hover:border-lab-secondary hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`tag ${a.severity === 'high' ? 'tag-danger' : a.severity === 'medium' ? 'tag-warn' : 'tag-info'}`}>
                      {severityLabel(a.severity)}
                    </span>
                    <span className="tag-neutral">{anomalyTypeLabel(a.anomalyType)}</span>
                    <span className="text-sm font-medium text-slate-700">{a.title}</span>
                  </div>
                  <span className={a.status === 'open' ? 'tag-warn' : a.status === 'handling' ? 'tag-info' : a.status === 'resolved' ? 'tag-success' : 'tag-neutral'}>
                    {a.status === 'open' ? '待处理' : a.status === 'handling' ? '处理中' : a.status === 'resolved' ? '已解决' : '已关闭'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{a.detail.slice(0, 80)}...</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="page-card">
        <h3 className="font-semibold text-slate-800 mb-4">处理操作时间线（界面/报告共用，异常留痕与安全提示统一记录）</h3>
        <div className="space-y-1">
          {processes
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((p) => (
              <div key={p.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-400 shrink-0 w-36">{p.createdAt}</span>
                <span className="text-slate-700 font-medium shrink-0 w-16">{p.operator}</span>
                <span className="tag-info shrink-0">{operationLabel(p.operationType)}</span>
                <span className="text-slate-600 flex-1">{p.description}</span>
                {p.safetyHint && (
                  <span className="tag-warn shrink-0" title={p.safetyHint}>安全提示</span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
