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

function escapeCSV(value: string | number | boolean): string {
  const str = String(value)
  if (str.includes(',') || str.includes('，') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
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
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.map(escapeCSV).join(',')),
  ].join('\n')
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
  const hasValidTraceLinks = Array.isArray(report.traceLinks) && report.traceLinks.length > 0
  const hasConclusion = typeof report.displacementConclusion === 'string'
  const summaryMatches = report.summary === pageSummary
  const hasTimestamp = typeof report.generatedAt === 'string' && report.generatedAt.length > 0

  const allLinksHaveRequiredFields = report.traceLinks.every(link =>
    typeof link.resultId === 'string' &&
    link.resultId.length > 0 &&
    typeof link.peakExtraction?.value === 'number' &&
    typeof link.alignment?.method === 'string'
  )

  return hasValidTraceLinks && hasConclusion && summaryMatches && hasTimestamp && allLinksHaveRequiredFields
}

export function validateExportContent(report: ExportReport, expectedConclusion: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (report.displacementConclusion !== expectedConclusion) {
    errors.push(`位移结论不匹配: 期望 "${expectedConclusion.slice(0, 30)}...", 实际 "${report.displacementConclusion.slice(0, 30)}..."`)
  }

  if (!Array.isArray(report.traceLinks)) {
    errors.push('traceLinks 不是数组')
  } else if (report.traceLinks.length === 0) {
    errors.push('traceLinks 为空数组')
  } else {
    report.traceLinks.forEach((link, index) => {
      if (!link.resultId) {
        errors.push(`traceLinks[${index}] 缺少 resultId`)
      }
      if (!link.peakExtraction || typeof link.peakExtraction.value !== 'number') {
        errors.push(`traceLinks[${index}] 缺少有效的 peakExtraction.value`)
      }
      if (!link.alignment || typeof link.alignment.method !== 'string') {
        errors.push(`traceLinks[${index}] 缺少有效的 alignment.method`)
      }
    })
  }

  if (!report.generatedAt || !new Date(report.generatedAt).getTime()) {
    errors.push('generatedAt 时间戳无效')
  }

  if (!report.summary || report.summary.length === 0) {
    errors.push('summary 为空')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
