import type { TensionReport } from '../types'
import { BOUNDARY_STATUS_LABELS, REPORT_STATUS_LABELS, DEFAULT_BOUNDARY_CONFIG } from '../types'

export function buildReportText(report: TensionReport): string {
  const lines: string[] = []
  lines.push('========== 滑轮组张力报告 ==========')
  lines.push(`设备编号：${report.equipmentId}`)
  lines.push(`报告ID：${report.id}`)
  lines.push(`录入时间：${new Date(report.createdAt).toLocaleString('zh-CN')}`)
  lines.push(`数据来源：${
    report.origin === 'new'
      ? '新建'
      : report.origin === 'override'
        ? '覆盖旧报告'
        : `子报告（父ID：${report.parentId ?? '未知'}，第${report.subIndex}份）`
  }`)
  lines.push('')
  lines.push('------------- 输入参数 -------------')
  lines.push(`载荷重量 W：${report.loadWeight} kg`)
  lines.push(`滑轮组数 n：${report.pulleyCount}`)
  lines.push(`重力加速度 g：${report.gravity} m/s²`)
  lines.push('')
  lines.push('------------- 计算过程 -------------')
  lines.push('公式：F = (W × g) / n')
  const forceN = report.loadWeight * report.gravity
  lines.push(`F = (${report.loadWeight} kg × ${report.gravity} m/s²) / ${report.pulleyCount}`)
  lines.push(`F = ${forceN.toFixed(2)} N / ${report.pulleyCount}`)
  lines.push(`F = ${report.tensionValue.toFixed(4)} kN`)
  lines.push('')
  lines.push('------------- 边界判定 -------------')
  lines.push(`边界：正常 ≤ ${DEFAULT_BOUNDARY_CONFIG.normalMax} kN，临界 ≤ ${DEFAULT_BOUNDARY_CONFIG.criticalMax} kN，超限 > ${DEFAULT_BOUNDARY_CONFIG.criticalMax} kN`)
  lines.push(`结果：${report.tensionValue.toFixed(2)} kN → ${BOUNDARY_STATUS_LABELS[report.boundaryStatus]}`)
  lines.push('')
  lines.push('------------- 后补备注 -------------')
  lines.push(report.supplementaryNote || '（未填写）')
  lines.push('')
  lines.push('------------- 结论 -------------')
  lines.push(report.conclusion)
  lines.push('')
  lines.push(`处理状态：${REPORT_STATUS_LABELS[report.status]}`)
  lines.push('=====================================')
  return lines.join('\n')
}

export function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportReportAsText(report: TensionReport) {
  const safeName = report.equipmentId.replace(/[\\/:*?"<>|]/g, '_')
  triggerDownload(
    `${safeName}-${new Date(report.createdAt).getTime()}-张力报告.txt`,
    buildReportText(report),
    'text/plain;charset=utf-8'
  )
}

export function exportReportAsJson(report: TensionReport) {
  const safeName = report.equipmentId.replace(/[\\/:*?"<>|]/g, '_')
  triggerDownload(
    `${safeName}-${new Date(report.createdAt).getTime()}-张力报告.json`,
    JSON.stringify(report, null, 2),
    'application/json;charset=utf-8'
  )
}

export function exportAllAsJson(reports: TensionReport[]) {
  triggerDownload(
    `滑轮组张力报告-全部-${Date.now()}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), reports }, null, 2),
    'application/json;charset=utf-8'
  )
}
