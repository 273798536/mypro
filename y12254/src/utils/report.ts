import type { CustomerCard, GameEvent, SimulationMetrics, WindowConfig, CorrelationEntry, ReviewReport } from '@/types'

export function generateReport(
  sessionId: string,
  levelId: string,
  windowConfig: WindowConfig,
  configHistory: { tick: number; config: WindowConfig }[],
  metrics: SimulationMetrics,
  events: GameEvent[],
  customers: CustomerCard[]
): ReviewReport {
  const completedCustomers = customers.filter(c => c.status === 'completed')
  const waitTimes = completedCustomers
    .filter(c => c.waitEndTime !== null && c.waitStartTime !== null)
    .map(c => c.waitEndTime! - c.waitStartTime)

  const distribution: number[] = []
  if (waitTimes.length > 0) {
    const maxWait = Math.max(...waitTimes)
    const bucketSize = Math.max(1, Math.ceil(maxWait / 10))
    for (let i = 0; i < 10; i++) {
      const lo = i * bucketSize
      const hi = (i + 1) * bucketSize
      distribution.push(waitTimes.filter(w => w >= lo && w < hi).length)
    }
  }

  const correlationChain: CorrelationEntry[] = customers.map((c, idx) => ({
    customerId: c.id,
    appointmentNo: c.appointmentNo,
    windowId: c.assignedWindow,
    reportItemIndex: idx,
    arrivalTime: c.arrivalTime,
    serviceDuration: c.serviceDuration,
    status: c.status,
  }))

  return {
    sessionId,
    levelId,
    windowConfig,
    configHistory,
    metrics,
    waitTimeDistribution: distribution,
    events,
    customerCards: customers,
    correlationChain,
  }
}

export function getWindowConclusion(report: ReviewReport): string {
  const { windowConfig, metrics, configHistory } = report
  const activeWindows = windowConfig.windowCount - windowConfig.disabledWindows.length
  const avgUtil = metrics.overallUtilization.toFixed(1)

  let conclusion = `窗口配置：共 ${windowConfig.windowCount} 个窗口，活跃 ${activeWindows} 个，停用 ${windowConfig.disabledWindows.length} 个。`
  conclusion += `平均利用率 ${avgUtil}%，`
  conclusion += `平均等待 ${metrics.avgWaitTime}，最大等待 ${metrics.maxWaitTime}。`
  conclusion += `完成 ${metrics.completedCount} 单，爽约 ${metrics.noShowCount} 单，放弃 ${metrics.abandonedCount} 单。`

  if (configHistory.length > 0) {
    conclusion += ` 配置变更 ${configHistory.length} 次。`
  }

  return conclusion
}

export function downloadJSON(report: ReviewReport): void {
  const conclusion = getWindowConclusion(report)
  const exportData = {
    ...report,
    windowConclusion: conclusion,
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `排队论奶茶店_报告_${report.sessionId}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSV(report: ReviewReport): void {
  const conclusion = getWindowConclusion(report)
  const header = '顾客ID,预约号,窗口,到达时间,制作时长,状态,报告索引\n'
  const rows = report.correlationChain.map(e =>
    `${e.customerId},${e.appointmentNo},${e.windowId ?? '无'},${e.arrivalTime},${e.serviceDuration},${e.status},${e.reportItemIndex}`
  ).join('\n')

  const blob = new Blob(['\uFEFF' + `# 窗口结论: ${conclusion}\n\n` + header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `排队论奶茶店_报告_${report.sessionId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
