import { useState, useMemo } from 'react'
import { FileJson, FileSpreadsheet, Download, Check, X, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useSeismicStore } from '@/store/useSeismicStore'
import { generateExportReport, downloadJSON, downloadCSV, checkConsistency, validateExportContent } from '@/utils/exportReport'

type ExportFormat = 'json' | 'csv'

export default function ExportPanel() {
  const traceLinks = useSeismicStore((s) => s.traceLinks)
  const conflicts = useSeismicStore((s) => s.conflicts)
  const alignmentResult = useSeismicStore((s) => s.alignmentResult)
  const displacementConclusion = useSeismicStore((s) => s.displacementConclusion)
  const setDisplacementConclusion = useSeismicStore((s) => s.setDisplacementConclusion)

  const [format, setFormat] = useState<ExportFormat>('json')
  const [showPreview, setShowPreview] = useState(false)

  const pageSummary = useMemo(() => {
    const peakCount = traceLinks.length
    const conflictCount = conflicts.length
    const maxDrift = alignmentResult ? Math.abs(alignmentResult.driftMs) : 0
    return `${peakCount}个峰值, ${conflictCount}个冲突, 最大漂移${maxDrift}ms`
  }, [traceLinks, conflicts, alignmentResult])

  const report = useMemo(
    () => generateExportReport(traceLinks, displacementConclusion, pageSummary),
    [traceLinks, displacementConclusion, pageSummary],
  )

  const isConsistent = useMemo(
    () => checkConsistency(report, pageSummary),
    [report, pageSummary],
  )

  const validation = useMemo(
    () => validateExportContent(report, displacementConclusion),
    [report, displacementConclusion],
  )

  const previewContent = useMemo(() => {
    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else {
      const headers = ['结果ID', '对齐方法', '漂移量(ms)', '峰值通道', '峰值时间', '峰值大小', '饱和', '关联照片数', '冲突数', '位移结论']
      const rows = report.traceLinks.slice(0, 3).map(link => [
        link.resultId,
        link.alignment.method,
        link.alignment.driftMs,
        link.peakExtraction.channel,
        new Date(link.peakExtraction.timestamp).toISOString(),
        link.peakExtraction.value,
        link.peakExtraction.saturated ? '是' : '否',
        link.damageAssociation.length,
        link.conflicts.length,
        report.displacementConclusion.slice(0, 20) + '...',
      ])
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n') +
        (report.traceLinks.length > 3 ? `\n... 还有 ${report.traceLinks.length - 3} 条记录` : '')
    }
  }, [format, report])

  const handleDownload = () => {
    if (format === 'json') {
      downloadJSON(report)
    } else {
      downloadCSV(report)
    }
  }

  return (
    <div className="rounded-lg border border-steel-700 bg-steel-900 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-steel-500">
          导出格式
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
              format === 'json'
                ? 'bg-signal/20 text-signal border border-signal/40'
                : 'bg-steel-800 text-steel-500 border border-steel-700 hover:border-steel-600 hover:text-slate-300'
            }`}
          >
            <FileJson size={14} />
            JSON
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
              format === 'csv'
                ? 'bg-signal/20 text-signal border border-signal/40'
                : 'bg-steel-800 text-steel-500 border border-steel-700 hover:border-steel-600 hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet size={14} />
            CSV
          </button>
        </div>
      </div>

      <div className="rounded-md border border-steel-700 bg-steel-800 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-steel-500">
            导出预览
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">
              追溯链接
            </span>
            <span className="font-mono text-lg text-slate-200 tabular-nums">
              {traceLinks.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">
              冲突数量
            </span>
            <span className={`font-mono text-lg tabular-nums ${
              conflicts.length > 0 ? 'text-warn' : 'text-signal'
            }`}>
              {conflicts.length}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-steel-500">
            位移结论
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                isConsistent ? 'bg-signal/20' : 'bg-saturated/20'
              }`}
            >
              {isConsistent ? (
                <Check size={10} className="text-signal" />
              ) : (
                <X size={10} className="text-saturated" />
              )}
            </div>
            <span className={`font-mono text-[10px] ${isConsistent ? 'text-signal' : 'text-saturated'}`}>
              {isConsistent ? '结构完整' : '结构不完整'}
            </span>
          </div>
        </div>
        <textarea
          value={displacementConclusion}
          onChange={(e) => setDisplacementConclusion(e.target.value)}
          placeholder="输入位移结论..."
          rows={3}
          className="w-full resize-none rounded-md border border-steel-700 bg-steel-800 px-3 py-2 font-sans text-sm text-slate-200 placeholder:text-steel-600 focus:border-signal/50 focus:outline-none focus:ring-1 focus:ring-signal/30"
        />
        {!validation.valid && (
          <div className="rounded-md border border-warn/40 bg-warn/10 p-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="text-warn mt-0.5 shrink-0" />
              <div className="space-y-1">
                {validation.errors.map((err, i) => (
                  <p key={i} className="font-mono text-[10px] text-warn">
                    ⚠ {err}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
        {validation.valid && (
          <div className="rounded-md border border-signal/40 bg-signal/10 p-2">
            <div className="flex items-center gap-2">
              <Check size={12} className="text-signal shrink-0" />
              <p className="font-mono text-[10px] text-signal">
                ✓ 导出内容结构完整，包含 {traceLinks.length} 条溯源记录
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-steel-700 bg-steel-800 px-4 py-2 font-mono text-xs text-steel-400 transition-colors hover:bg-steel-700 hover:text-slate-300"
        >
          {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPreview ? '隐藏' : '显示'}导出内容预览
        </button>
        {showPreview && (
          <div className="rounded-md border border-steel-700 bg-steel-950 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">
                预览内容（{format.toUpperCase()}）
              </span>
              <span className="font-mono text-[10px] text-steel-500">
                共 {previewContent.length} 字符
              </span>
            </div>
            <pre className="overflow-x-auto font-mono text-[10px] text-steel-400 whitespace-pre-wrap break-all">
{previewContent}
            </pre>
          </div>
        )}
      </div>

      <div className="rounded-md border border-steel-700 bg-steel-800 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">
          页面摘要
        </span>
        <p className="mt-1 font-sans text-xs text-slate-400">{pageSummary}</p>
      </div>

      <button
        onClick={handleDownload}
        disabled={traceLinks.length === 0 || !validation.valid}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-signal/20 px-4 py-2.5 font-mono text-sm font-medium text-signal transition-colors hover:bg-signal/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-signal/20"
      >
        <Download size={16} />
        下载 {format.toUpperCase()} 报告
      </button>
    </div>
  )
}
