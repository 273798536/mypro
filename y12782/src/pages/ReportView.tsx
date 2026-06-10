import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLabStore } from '../store'

export default function ReportView() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const getBatch = useLabStore((s) => s.getBatchById)
  const getSpectrums = useLabStore((s) => s.getSpectrumsByBatchId)
  const getAnomalies = useLabStore((s) => s.getAnomaliesByBatchId)
  const getProcesses = useLabStore((s) => s.getProcessesByBatchId)
  const generateReport = useLabStore((s) => s.generateReport)
  const exportReportText = useLabStore((s) => s.exportReportText)

  const [report, setReport] = useState<ReturnType<typeof generateReport> | null>(null)
  const [operator, setOperator] = useState('')

  const batch = getBatch(batchId!)
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

  const handleGenerate = () => {
    const name = operator.trim() || batch.preparator
    const r = generateReport(batch.id, name)
    setReport(r)
  }

  const handleExport = () => {
    const text = exportReportText(batch.id)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `标准液有效期报告_${batch.batchNo}_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const conclusionColor =
    report?.validityConclusion === 'valid'
      ? 'text-green-700 bg-green-50 border-green-200'
      : report?.validityConclusion === 'invalid'
        ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-amber-700 bg-amber-50 border-amber-200'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← 返回</button>
        <h2 className="text-2xl font-bold text-slate-800">有效期检测报告</h2>
        <span className="text-sm text-slate-500">{batch.batchNo}</span>
      </div>

      {!report && (
        <div className="page-card">
          <h3 className="font-semibold text-slate-800 mb-4">生成报告</h3>
          <p className="text-sm text-slate-600 mb-4">
            报告将包含标准液基本信息、谱图检测结论、异常记录摘要、通俗解释以及完整的处理操作时间线。
            界面显示和导出文件共用同一批处理记录，数据一致。
          </p>
          <div className="flex items-end gap-4">
            <div>
              <label className="label-field">报告生成人</label>
              <input className="input-field w-48" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder={batch.preparator} />
            </div>
            <button onClick={handleGenerate} className="btn-primary">生成报告</button>
          </div>
        </div>
      )}

      {report && (
        <>
          <div className={`page-card border ${conclusionColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  有效期结论：{report.validityConclusion === 'valid' ? '有效' : report.validityConclusion === 'invalid' ? '无效' : '需关注'}
                </div>
                <div className="text-sm mt-1">{report.summary}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExport} className="btn-secondary text-sm">导出文本文件</button>
                <button onClick={() => { navigator.clipboard.writeText(exportReportText(batch.id)) }} className="btn-ghost text-sm">复制全文</button>
              </div>
            </div>
          </div>

          <div className="page-card">
            <h3 className="font-semibold text-slate-800 mb-3">通俗解释（可直接复制给同事）</h3>
            <div className="p-4 bg-blue-50 rounded-lg text-sm text-slate-800 leading-relaxed">
              {report.plainLanguageSummary}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(report.plainLanguageSummary)}
              className="btn-ghost mt-3 text-sm"
            >
              复制到剪贴板
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="page-card">
              <h3 className="font-semibold text-slate-800 mb-3">谱图检测结论</h3>
              <p className="text-sm text-slate-700">{report.spectrumConclusion}</p>
              {spectrums.length > 0 && (
                <div className="mt-3 space-y-2">
                  {spectrums.map((s) => (
                    <div key={s.id} className={`text-xs p-2 rounded ${s.hasOverlap ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {s.analysisDate} - {s.conclusion === 'qualified' ? '合格' : s.conclusion === 'unqualified' ? '不合格' : '待判定'}
                      {s.hasOverlap && '（谱峰重叠）'}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="page-card">
              <h3 className="font-semibold text-slate-800 mb-3">异常摘要</h3>
              <p className="text-sm text-slate-700">{report.anomalySummary}</p>
              {anomalies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {anomalies.map((a) => (
                    <Link key={a.id} to={`/anomalies/${a.id}`} className="block text-xs p-2 rounded bg-slate-50 hover:bg-slate-100">
                      <span className={`tag ${a.severity === 'high' ? 'tag-danger' : a.severity === 'medium' ? 'tag-warn' : 'tag-info'}`}>
                        {a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低'}
                      </span>
                      <span className="ml-1">{a.title}</span>
                      <span className="ml-1 text-slate-400">
                        {a.status === 'open' ? '待处理' : a.status === 'handling' ? '处理中' : a.status === 'resolved' ? '已解决' : '已关闭'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="page-card">
            <h3 className="font-semibold text-slate-800 mb-3">处理操作时间线（界面/报告共用）</h3>
            <p className="text-xs text-slate-400 mb-3">异常留痕与安全提示共用同一批处理记录，界面和导出文件数据完全一致</p>
            <div className="space-y-1">
              {processes
                .slice()
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((p) => (
                  <div key={p.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-400 shrink-0 w-36">{p.createdAt}</span>
                    <span className="text-slate-700 font-medium shrink-0 w-16">{p.operator}</span>
                    <span className="tag-info shrink-0">
                      {p.operationType === 'create_batch' ? '创建批次' :
                       p.operationType === 'update_batch' ? '修改批次' :
                       p.operationType === 'import_spectrum' ? '导入谱图' :
                       p.operationType === 'dedupe_spectrum' ? '谱图去重' :
                       p.operationType === 'detect_overlap' ? '检测谱峰重叠' :
                       p.operationType === 'mark_anomaly' ? '登记异常' :
                       p.operationType === 'add_safety_hint' ? '追加安全提示' :
                       p.operationType === 'handle_anomaly' ? '处理异常' :
                       p.operationType === 'audit' ? '复核批次' : '导出报告'}
                    </span>
                    <span className="text-slate-600 flex-1">{p.description}</span>
                    {p.safetyHint && (
                      <span className="text-xs text-amber-700 shrink-0">⚡{p.safetyHint}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div className="page-card">
            <h3 className="font-semibold text-slate-800 mb-3">导出预览（适合不懂代码的人阅读）</h3>
            <p className="text-xs text-slate-400 mb-3">
              导出文件全部使用中文描述，浓度偏差原因不使用字段名和缩写，可直接转给非技术人员查看
            </p>
            <pre className="bg-slate-50 p-4 rounded-lg text-xs text-slate-700 overflow-auto max-h-96 whitespace-pre-wrap">
              {exportReportText(batch.id)}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
