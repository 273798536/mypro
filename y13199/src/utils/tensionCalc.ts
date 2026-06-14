import type { BoundaryStatus, BoundaryConfig, TensionReport, ReportStatus } from '../types'
import { DEFAULT_BOUNDARY_CONFIG, DEFAULT_GRAVITY } from '../types'

export function calculateTension(
  loadWeight: number,
  pulleyCount: number,
  gravity: number = DEFAULT_GRAVITY
): number {
  if (pulleyCount <= 0) return 0
  const tensionNewtons = (loadWeight * gravity) / pulleyCount
  return tensionNewtons / 1000
}

export function determineBoundary(
  tensionValue: number,
  config: BoundaryConfig = DEFAULT_BOUNDARY_CONFIG
): BoundaryStatus {
  if (tensionValue <= config.normalMax) return 'normal'
  if (tensionValue <= config.criticalMax) return 'critical'
  return 'exceeded'
}

export function generateConclusion(
  tensionValue: number,
  boundaryStatus: BoundaryStatus,
  equipmentId: string,
  supplementaryNote: string
): string {
  const statusText =
    boundaryStatus === 'normal'
      ? '在正常范围内'
      : boundaryStatus === 'critical'
        ? '处于临界状态，需关注'
        : '已超限，需人工确认'

  let conclusion = `设备 ${equipmentId} 滑轮组张力值为 ${tensionValue.toFixed(2)} kN，${statusText}。`

  if (supplementaryNote.trim()) {
    conclusion += ` 后补备注：${supplementaryNote.trim()}。`
  }

  if (boundaryStatus === 'exceeded') {
    conclusion += ' 建议立即安排人工复检。'
  } else if (boundaryStatus === 'critical') {
    conclusion += ' 建议下次巡检重点关注。'
  }

  return conclusion
}

export function generatePageSummary(report: TensionReport): string {
  const statusLabel =
    report.boundaryStatus === 'normal'
      ? '正常'
      : report.boundaryStatus === 'critical'
        ? '临界'
        : '超限'
  const noteStatus = report.supplementaryNote.trim() ? '已附备注' : '无备注'
  return `设备${report.equipmentId}｜张力 ${report.tensionValue.toFixed(2)} kN｜判定：${statusLabel}｜${noteStatus}`
}

export function determineReportStatus(
  boundaryStatus: BoundaryStatus,
  supplementaryNote: string,
  isDuplicate: boolean
): ReportStatus {
  if (isDuplicate || boundaryStatus === 'exceeded') return 'manual_override'
  if (!supplementaryNote.trim()) return 'pending_material'
  return 'processed'
}
