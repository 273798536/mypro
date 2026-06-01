import type { TraceLink, ExportReport } from '@/types'

export function generateExportReport(
  traceLinks: TraceLink[],
  displacementConclusion: string,
  pageSummary: string,
): ExportReport {
  const report: ExportReport = {
    displacementConclusion,
    generatedAt: new Date().toISOString(),
    traceLinks,
    summary: pageSummary,
  }
  return report
}

export function downloadJSON(report: ExportReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `地震波回放报告_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSV(report: ExportReport): void {
  const headers = ['结果ID', '对齐方法', '漂移量(ms)', '峰值通道', '峰值时间', '峰值大小', '饱和', '关联照片数', '冲突数', '位移结论']
  const rows = report.traceLinks.map(link => [
    link.resultId,
    link.alignment.method,
    link.alignment.driftMs,
    link.peakExtraction.channel,
    new Date(link.peakExtraction.timestamp).toISOString(),
    link.peakExtraction.value,
    link.peakExtraction.saturated ? '是' : '否',
    link.damageAssociation.length,
    link.conflicts.length,
    report.displacementConclusion,
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `地震波回放报告_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function checkConsistency(report: ExportReport, pageSummary: string): boolean {
  return report.displacementConclusion === pageSummary || report.summary === pageSummary
}
