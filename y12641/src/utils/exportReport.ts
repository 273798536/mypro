import type { ReportData } from '../types'

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}分${sec}秒`
}

const actionLabel: Record<string, string> = {
  place: '放置货物',
  undo: '撤销操作',
  restart: '重开关卡',
  snap_toggle: '切换网格吸附',
  clear: '移除货物',
}

export const buildHumanReadableReport = (report: ReportData): string => {
  const lines: string[] = []

  lines.push('══════════════════════════════════════════════')
  lines.push('        船舶甲板货位草图标注 · 结算报告')
  lines.push('══════════════════════════════════════════════')
  lines.push('')
  lines.push(`【任务名称】${report.levelName}`)
  lines.push(`【完成时间】${new Date(report.completedAt).toLocaleString('zh-CN')}`)
  lines.push(`【总耗时】${formatDuration(report.totalDuration)}`)
  lines.push('')

  lines.push('──────────────────────────────────────────────')
  lines.push('一、操作统计')
  lines.push('──────────────────────────────────────────────')
  lines.push(`  • 成功放置货物：${report.placements.length} 件`)
  lines.push(`  • 撤销次数：${report.undoCount} 次`)
  lines.push(`  • 重开关卡：${report.restartCount} 次`)
  lines.push(`  • 边界放置失败：${report.boundaryFailures} 次`)
  lines.push(`  • 碰撞事件：${report.collisionEvents} 次`)
  lines.push(`  • 网格吸附切换：${report.gridSnapChanges} 次`)
  lines.push('')

  lines.push('──────────────────────────────────────────────')
  lines.push('二、已放置货位明细')
  lines.push('──────────────────────────────────────────────')
  if (report.placements.length === 0) {
    lines.push('  （无已放置货物）')
  } else {
    report.placements.forEach((p, idx) => {
      const issue = report.issues.find((i) => i.cargoId === p.cargoId)
      lines.push(`  ${idx + 1}. ${issue?.cargoName ?? p.cargoId}`)
      lines.push(`     坐标：(${p.x}, ${p.y})  ${p.gridSnapped ? '[已吸附网格]' : '[未吸附网格]'}`)
      lines.push(`     放置时间：${new Date(p.placedAt).toLocaleTimeString('zh-CN')}`)
      if (issue) {
        lines.push(`     ⚠ 该货物存在材料问题：${issue.issueType}`)
      }
    })
  }
  lines.push('')

  lines.push('──────────────────────────────────────────────')
  lines.push('三、材料问题与复核结果')
  lines.push('──────────────────────────────────────────────')
  if (report.issues.length === 0) {
    lines.push('  （本批次材料未发现问题）')
  } else {
    report.issues.forEach((i, idx) => {
      lines.push(`  ${idx + 1}. 问题类型：${i.issueType}`)
      lines.push(`     涉及货物：${i.cargoName}`)
      lines.push(`     材料来源：${i.materialSource}`)
      lines.push(`     问题说明：${i.issueDescription}`)
      lines.push(`     处理状态：${i.resolved ? '✔ 已处理' : '✘ 未处理 / 需跟进'}`)
      lines.push('')
    })
  }

  lines.push('──────────────────────────────────────────────')
  lines.push('四、撤销与重开记录（训练员重点查看）')
  lines.push('──────────────────────────────────────────────')
  const undoOrRestart = report.history.filter((h) => h.action === 'undo' || h.action === 'restart')
  if (undoOrRestart.length === 0) {
    lines.push('  （无撤销或重开记录）')
  } else {
    undoOrRestart.forEach((h, idx) => {
      lines.push(`  ${idx + 1}. 【${actionLabel[h.action] ?? h.action}】`)
      lines.push(`     时间：${new Date(h.timestamp).toLocaleTimeString('zh-CN')}`)
      lines.push(`     内容：${h.description}`)
      if (h.stateDesync) {
        lines.push(`     ⚠ 状态不同步提示：`)
        lines.push(`       卡在材料：${h.stateDesync.material}`)
        lines.push(`       原因：${h.stateDesync.reason}`)
      }
      lines.push('')
    })
  }

  lines.push('──────────────────────────────────────────────')
  lines.push('五、完整操作时间线')
  lines.push('──────────────────────────────────────────────')
  report.history.forEach((h, idx) => {
    lines.push(
      `  ${String(idx + 1).padStart(2, '0')}  ${new Date(h.timestamp).toLocaleTimeString('zh-CN')}  【${actionLabel[h.action] ?? h.action}】  ${h.description}`
    )
  })
  lines.push('')
  lines.push('══════════════════════════════════════════════')
  lines.push('                报告结束')
  lines.push('══════════════════════════════════════════════')

  return lines.join('\n')
}

export const downloadReport = (report: ReportData) => {
  const text = buildHumanReadableReport(report)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = report.levelName.replace(/[\\/:*?"<>|]/g, '_')
  a.href = url
  a.download = `货位草图标注报告_${safeName}_${Date.now()}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
