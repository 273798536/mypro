import type { Anomaly, CalibrationPoint, ScaleReference, EquipmentItem, CanvasSnapshot } from '@/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function anomalyTypeLabel(type: Anomaly['type']): string {
  switch (type) {
    case 'coordinate_flip': return '坐标翻转'
    case 'scale_mismatch': return '比例尺偏差'
    case 'missing_equipment': return '设备缺失'
  }
}

function severityLabel(severity: Anomaly['severity']): string {
  switch (severity) {
    case 'need_material': return '需补材料'
    case 'need_caliber_change': return '需改口径'
  }
}

export function generateReport(data: {
  round: number
  elapsedTime: number
  points: CalibrationPoint[]
  scaleRefs: ScaleReference[]
  anomalies: Anomaly[]
  equipment: EquipmentItem[]
  snapshots: CanvasSnapshot[]
}): string {
  const { round, elapsedTime, points, scaleRefs, anomalies, equipment, snapshots } = data
  const flipAnomalies = anomalies.filter((a) => a.type === 'coordinate_flip')
  const materialAnomalies = anomalies.filter((a) => a.severity === 'need_material')
  const caliberAnomalies = anomalies.filter((a) => a.severity === 'need_caliber_change')
  const passRate = points.length > 0
    ? ((points.length - flipAnomalies.length) / points.length * 100).toFixed(1)
    : '100.0'

  const lines: string[] = []

  lines.push('═══════════════════════════════════════════')
  lines.push('    手绘地图比例尺校对 · 复盘报告')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push(`轮次：第 ${round} 轮`)
  lines.push(`校对时长：${formatTime(elapsedTime)}`)
  lines.push(`生成时间：${formatDate(Date.now())}`)
  lines.push('')

  lines.push('── 一、校对统计 ──')
  lines.push('')
  lines.push(`标注点数量：${points.length}`)
  lines.push(`比例尺参考线：${scaleRefs.length} 条`)
  lines.push(`异常总数：${anomalies.length}`)
  lines.push(`  - 需补材料：${materialAnomalies.length} 项`)
  lines.push(`  - 需改口径：${caliberAnomalies.length} 项`)
  lines.push(`通过率：${passRate}%`)
  lines.push('')

  lines.push('── 二、设备清单 ──')
  lines.push('')
  if (equipment.length === 0) {
    lines.push('（未补录设备）')
  } else {
    equipment.forEach((eq, i) => {
      lines.push(`${i + 1}. ${eq.name} — ${eq.spec}（补录于 ${formatDate(eq.addedAt)}）`)
    })
  }
  lines.push('')

  lines.push('── 三、标注点列表 ──')
  lines.push('')
  if (points.length === 0) {
    lines.push('（无标注点）')
  } else {
    points.forEach((p, i) => {
      const hasFlip = flipAnomalies.some((a) => a.pointId === p.id)
      const marker = hasFlip ? ' ⚠翻转' : ' ✓'
      lines.push(`${i + 1}. ${p.label}：坐标 (${p.x.toFixed(1)}, ${p.y.toFixed(1)})${marker}`)
      if (p.manualNote) {
        lines.push(`   人工备注：「${p.manualNote}」`)
      }
    })
  }
  lines.push('')

  lines.push('── 四、异常详情 ──')
  lines.push('')
  if (anomalies.length === 0) {
    lines.push('未检测到异常，校对通过。')
  } else {
    anomalies.forEach((a, i) => {
      lines.push(`【异常 ${i + 1}】${anomalyTypeLabel(a.type)} — ${severityLabel(a.severity)}`)
      lines.push(`  摘要：${a.description}`)
      lines.push(`  检出时间：${formatDate(a.timestamp)}`)
      lines.push('')
      lines.push(`  普通话解释：`)
      lines.push(`  ${a.plainExplanation}`)
      lines.push('')
      if (a.manualNote) {
        lines.push(`  人工备注（原话保留）：`)
        lines.push(`  「${a.manualNote}」`)
      } else {
        lines.push(`  人工备注：（无）`)
      }
      lines.push('')
    })
  }

  lines.push('── 五、操作时间线 ──')
  lines.push('')
  if (snapshots.length === 0) {
    lines.push('（无操作记录）')
  } else {
    snapshots.forEach((snap, i) => {
      lines.push(`${i + 1}. [${formatDate(snap.timestamp)}] ${snap.action}`)
    })
  }
  lines.push('')

  lines.push('── 六、坐标翻转专项说明 ──')
  lines.push('')
  if (flipAnomalies.length === 0) {
    lines.push('本轮校对未检测到坐标翻转。')
  } else {
    lines.push(`共检测到 ${flipAnomalies.length} 处坐标翻转，详情如下：`)
    lines.push('')
    flipAnomalies.forEach((a, i) => {
      const point = points.find((p) => p.id === a.pointId)
      lines.push(`【翻转 ${i + 1}】`)
      lines.push(`  涉及标注点：${point?.label || a.pointId}`)
      if (point) {
        lines.push(`  标注点坐标：(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`)
      }
      lines.push(`  ${a.plainExplanation}`)
      if (a.manualNote) {
        lines.push(`  人工备注（原话保留）：「${a.manualNote}」`)
      }
      lines.push('')
    })
  }

  lines.push('═══════════════════════════════════════════')
  lines.push('  报告结束 · 评审老师可直接阅读本报告')
  lines.push('═══════════════════════════════════════════')

  return lines.join('\n')
}
