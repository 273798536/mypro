import { useState, useMemo } from 'react'
import { FileJson, FileSpreadsheet, Download, Check, X } from 'lucide-react'
import { useSeismicStore } from '@/store/useSeismicStore'
import { generateExportReport, downloadJSON, downloadCSV, checkConsistency } from '@/utils/exportReport'

type ExportFormat = 'json' | 'csv'

export default function ExportPanel() {
  const traceLinks = useSeismicStore((s) => s.traceLinks)
  const conflicts = useSeismicStore((s) => s.conflicts)
  const alignmentResult = useSeismicStore((s) => s.alignmentResult)
  const displacementConclusion = useSeismicStore((s) => s.displacementConclusion)
  const setDisplacementConclusion = useSeismicStore((s) => s.setDisplacementConclusion)

  const [format, setFormat] = useState<ExportFormat>('json')

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
              {isConsistent ? '与摘要一致' : '与摘要不一致'}
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
      </div>

      <div className="rounded-md border border-steel-700 bg-steel-800 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">
          页面摘要
        </span>
        <p className="mt-1 font-sans text-xs text-slate-400">{pageSummary}</p>
      </div>

      <button
        onClick={handleDownload}
        disabled={traceLinks.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-signal/20 px-4 py-2.5 font-mono text-sm font-medium text-signal transition-colors hover:bg-signal/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-signal/20"
      >
        <Download size={16} />
        下载 {format.toUpperCase()} 报告
      </button>
    </div>
  )
}
