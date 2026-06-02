import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import type { Collision, ReportConfig } from '@/types'
import { getAnomalyTypeName, getStatusName } from './calculationEngine'

export function generatePDFReport(
  collisions: Collision[],
  config: ReportConfig,
  speedSource: string,
  massSource: string,
  videoNotes: string = ''
): Blob {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  let y = margin

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('小球碰撞动量复盘报告', pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, margin, y)
  y += 5
  doc.text(`速度记录来源: ${speedSource || '未导入'}`, margin, y)
  y += 5
  doc.text(`质量表来源: ${massSource || '未导入'}`, margin, y)
  y += 10

  if (videoNotes && videoNotes.trim().length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('视频备注', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const notesLines = videoNotes.split('\n')
    notesLines.forEach((line) => {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      doc.text(`  ${line}`, margin, y)
      y += 4
    })
    y += 6
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('一、碰撞事件概览', margin, y)
  y += 8

  const normalCount = collisions.filter((c) => c.status === 'normal').length
  const warningCount = collisions.filter((c) => c.status === 'warning').length
  const errorCount = collisions.filter((c) => c.status === 'error').length

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`总碰撞次数: ${collisions.length}`, margin, y)
  y += 5
  doc.text(`正常: ${normalCount}次`, margin, y)
  y += 5
  doc.text(`警告: ${warningCount}次`, margin, y)
  y += 5
  doc.text(`异常: ${errorCount}次`, margin, y)
  y += 10

  if (config.includeAnomalies) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('二、异常检测结果', margin, y)
    y += 8

    const allAnomalies = collisions.flatMap((c) =>
      c.anomalies.map((a) => ({ ...a, collisionTime: c.collisionTimeFormatted }))
    )

    if (allAnomalies.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('未检测到异常', margin, y)
      y += 8
    } else {
      allAnomalies.forEach((anomaly, i) => {
        if (y > 270) {
          doc.addPage()
          y = margin
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + 1}. [${getAnomalyTypeName(anomaly.type)}] - 碰撞时间: ${anomaly.collisionTime}`, margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`   ${anomaly.description}`, margin, y)
        y += 5
        doc.text(`   严重程度: ${anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低'}`, margin, y)
        y += 8
      })
    }
  }

  collisions.forEach((collision, idx) => {
    if (y > 250) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`碰撞事件 ${idx + 1} - 时间: ${collision.collisionTimeFormatted}`, margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`状态: ${getStatusName(collision.status)} | 参与小球: ${collision.ballIds.join(', ')}`, margin, y)
    y += 6

    if (collision.videoNotes && collision.videoNotes.trim().length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('碰撞备注:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const collisionNotesLines = collision.videoNotes.split('\n')
      collisionNotesLines.forEach((line) => {
        if (y > 270) {
          doc.addPage()
          y = margin
        }
        doc.text(`  ${line}`, margin, y)
        y += 4
      })
      y += 3
    }

    if (config.includeRawData) {
      doc.text('碰撞前数据:', margin, y)
      y += 5
      collision.calculationResult.ballsBefore.forEach((ball) => {
        doc.text(
          `  球${ball.ballId}: 质量=${ball.mass ?? '缺失'}kg, 速度=(${ball.velocityX.toFixed(3)}, ${ball.velocityY.toFixed(3)})m/s`,
          margin,
          y
        )
        y += 4
      })

      doc.text('碰撞后数据:', margin, y)
      y += 5
      collision.calculationResult.ballsAfter.forEach((ball) => {
        doc.text(
          `  球${ball.ballId}: 质量=${ball.mass ?? '缺失'}kg, 速度=(${ball.velocityX.toFixed(3)}, ${ball.velocityY.toFixed(3)})m/s`,
          margin,
          y
        )
        y += 4
      })
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('计算结果:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(
      `  碰撞前总动量: ${collision.calculationResult.totalMomentumBefore.toFixed(4)} kg·m/s`,
      margin,
      y
    )
    y += 4
    doc.text(
      `  碰撞后总动量: ${collision.calculationResult.totalMomentumAfter.toFixed(4)} kg·m/s`,
      margin,
      y
    )
    y += 4
    doc.text(
      `  动量差异: ${collision.calculationResult.momentumDifference.toFixed(4)} (${(collision.calculationResult.momentumDifferencePercent * 100).toFixed(2)}%)`,
      margin,
      y
    )
    y += 4
    doc.text(
      `  能量损失: ${collision.calculationResult.energyLoss.toFixed(4)} J (${(collision.calculationResult.energyLossPercent * 100).toFixed(2)}%)`,
      margin,
      y
    )
    y += 8

    if (config.includeCalculationSteps && collision.calculationResult.calculationSteps) {
      doc.setFont('helvetica', 'bold')
      doc.text('计算步骤:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      collision.calculationResult.calculationSteps.forEach((step) => {
        if (y > 270) {
          doc.addPage()
          y = margin
        }
        doc.text(`  ${step.step}. ${step.description}`, margin, y)
        y += 4
        doc.text(`     公式: ${step.formula}`, margin, y)
        y += 4
        doc.text(`     结果: ${step.result}`, margin, y)
        y += 6
      })
    }

    y += 5
    doc.line(margin, y, pageWidth - margin, y)
    y += 8
  })

  return doc.output('blob')
}

export function generateExcelReport(
  collisions: Collision[],
  config: ReportConfig,
  speedRecords: { ballId: number; timestamp: number; velocityX: number; velocityY: number }[],
  massTable: { ballId: number; mass: number }[],
  videoNotes: string = ''
): Blob {
  const wb = XLSX.utils.book_new()

  const overviewData = [
    ['碰撞事件概览'],
    ['碰撞ID', '碰撞时间', '参与小球', '状态', '异常数量', '动量差异%', '能量损失%', '视频备注'],
    ...collisions.map((c) => [
      c.id,
      c.collisionTimeFormatted,
      c.ballIds.join(','),
      getStatusName(c.status),
      c.anomalies.length,
      (c.calculationResult.momentumDifferencePercent * 100).toFixed(2),
      (c.calculationResult.energyLossPercent * 100).toFixed(2),
      c.videoNotes || '',
    ]),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(overviewData)
  XLSX.utils.book_append_sheet(wb, ws1, '概览')

  if (videoNotes && videoNotes.trim().length > 0) {
    const notesData = [
      ['全局视频备注'],
      ['备注内容'],
      ...videoNotes.split('\n').map((line) => [line]),
    ]
    const wsNotes = XLSX.utils.aoa_to_sheet(notesData)
    XLSX.utils.book_append_sheet(wb, wsNotes, '视频备注')
  }

  if (config.includeAnomalies) {
    const anomalyData = [
      ['异常详情'],
      ['碰撞ID', '碰撞时间', '异常类型', '严重程度', '描述'],
      ...collisions.flatMap((c) =>
        c.anomalies.map((a) => [
          c.id,
          c.collisionTimeFormatted,
          getAnomalyTypeName(a.type),
          a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低',
          a.description,
        ])
      ),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(anomalyData)
    XLSX.utils.book_append_sheet(wb, ws2, '异常记录')
  }

  if (config.includeRawData) {
    const resultData = [
      ['详细计算结果'],
      ['碰撞ID', '小球ID', '阶段', '质量(kg)', '速度X(m/s)', '速度Y(m/s)', '动量X', '动量Y', '动能(J)'],
      ...collisions.flatMap((c) => [
        ...c.calculationResult.ballsBefore.map((b) => [
          c.id,
          b.ballId,
          '碰撞前',
          b.mass ?? '缺失',
          b.velocityX.toFixed(4),
          b.velocityY.toFixed(4),
          b.momentumX.toFixed(4),
          b.momentumY.toFixed(4),
          b.kineticEnergy.toFixed(4),
        ]),
        ...c.calculationResult.ballsAfter.map((b) => [
          c.id,
          b.ballId,
          '碰撞后',
          b.mass ?? '缺失',
          b.velocityX.toFixed(4),
          b.velocityY.toFixed(4),
          b.momentumX.toFixed(4),
          b.momentumY.toFixed(4),
          b.kineticEnergy.toFixed(4),
        ]),
      ]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(resultData)
    XLSX.utils.book_append_sheet(wb, ws3, '计算结果')

    const speedData = [
      ['速度原始记录'],
      ['小球ID', '时间戳(s)', '速度X(m/s)', '速度Y(m/s)'],
      ...speedRecords.map((r) => [r.ballId, r.timestamp.toFixed(3), r.velocityX, r.velocityY]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(speedData)
    XLSX.utils.book_append_sheet(wb, ws4, '速度记录')

    const massData = [
      ['质量表'],
      ['小球ID', '质量(kg)'],
      ...massTable.map((m) => [m.ballId, m.mass]),
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(massData)
    XLSX.utils.book_append_sheet(wb, ws5, '质量表')
  }

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
