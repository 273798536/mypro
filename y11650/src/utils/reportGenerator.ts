import type { Order, ActionLog, ServiceReport } from '../types/game'

export function generateReport(sessionId: string, levelId: string, orders: Order[], actions: ActionLog[]): ServiceReport {
  const unhandled = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
  const corrected = actions.filter(a => a.category === 'correction')
  const needReview = actions.filter(a =>
    a.category === 'allergy_mismatch' || a.category === 'grade_mismatch'
  )

  const delivered = orders.filter(o => o.status === 'delivered').length
  const totalOrders = orders.length
  const allergyMismatches = actions.filter(a => a.category === 'allergy_mismatch').length
  const windowCongestions = actions.filter(a => a.category === 'window_congestion').length
  const foodWaste = actions.filter(a => a.category === 'food_waste').length
  const gradeMismatches = actions.filter(a => a.category === 'grade_mismatch').length

  return {
    sessionId,
    levelId,
    unhandled,
    corrected,
    needReview,
    statistics: {
      totalOrders,
      delivered,
      allergyMismatches,
      windowCongestions,
      foodWaste,
      gradeMismatches,
      accuracy: totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0,
    },
  }
}

export function exportReportAsJSON(report: ServiceReport): string {
  return JSON.stringify(report, null, 2)
}

export function exportReportAsText(report: ServiceReport): string {
  const lines: string[] = []
  lines.push('═══════════════════════════════════════')
  lines.push('      校园食堂备餐 Rush - 服务报告')
  lines.push('═══════════════════════════════════════')
  lines.push(`会话ID: ${report.sessionId}`)
  lines.push(`关卡: ${report.levelId}`)
  lines.push('')

  lines.push('【统计概览】')
  lines.push(`  总订单数: ${report.statistics.totalOrders}`)
  lines.push(`  已交付: ${report.statistics.delivered}`)
  lines.push(`  正确率: ${report.statistics.accuracy}%`)
  lines.push(`  过敏错配: ${report.statistics.allergyMismatches}次`)
  lines.push(`  窗口拥堵: ${report.statistics.windowCongestions}次`)
  lines.push(`  备餐浪费: ${report.statistics.foodWaste}次`)
  lines.push(`  年级错配: ${report.statistics.gradeMismatches}次`)
  lines.push('')

  lines.push('【未处理订单】')
  if (report.unhandled.length === 0) {
    lines.push('  无')
  } else {
    report.unhandled.forEach((o, i) => {
      lines.push(`  ${i + 1}. ${o.grade} | 状态: ${o.status} | 过敏原: ${o.allergens.join('、') || '无'}`)
    })
  }
  lines.push('')

  lines.push('【已修正记录】')
  if (report.corrected.length === 0) {
    lines.push('  无')
  } else {
    report.corrected.forEach((a, i) => {
      lines.push(`  ${i + 1}. [${a.category}] ${a.action} (${a.points > 0 ? '+' : ''}${a.points}分) | 来源: ${a.source || '系统'}`)
    })
  }
  lines.push('')

  lines.push('【需人工确认】')
  if (report.needReview.length === 0) {
    lines.push('  无')
  } else {
    report.needReview.forEach((a, i) => {
      lines.push(`  ${i + 1}. [${a.category}] ${a.action} (${a.points}分) | 来源: ${a.source || '系统'}`)
      if (a.orderId) lines.push(`     订单ID: ${a.orderId}`)
    })
  }
  lines.push('')
  lines.push('═══════════════════════════════════════')

  return lines.join('\n')
}
