import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import type {
  ReportPreview,
  PeakAnalysisResult,
  BalanceCalcResult,
  TraceLog,
  ConclusionLevel,
  WeighingRecord,
} from '../types/index.js'

function determineConclusionLevel(
  peakAnalysis: PeakAnalysisResult | null,
  balanceCalc: BalanceCalcResult | null,
  traceLogs: TraceLog[],
): ConclusionLevel {
  const highSeverityLogs = traceLogs.filter((t) => t.severity === 'high' && !t.resolved)

  if (highSeverityLogs.length > 0 || balanceCalc?.status === 'bad') {
    return 'reject'
  }

  const mediumSeverityLogs = traceLogs.filter(
    (t) => t.severity === 'medium' && !t.resolved,
  )
  if (
    mediumSeverityLogs.length > 0 ||
    balanceCalc?.status === 'pending' ||
    (peakAnalysis && peakAnalysis.overlaps.length > 0)
  ) {
    return 'review'
  }

  return 'usable'
}

function generateSummary(
  conclusionLevel: ConclusionLevel,
  peakAnalysis: PeakAnalysisResult | null,
  balanceCalc: BalanceCalcResult | null,
  traceLogs: TraceLog[],
): string {
  const parts: string[] = []

  if (peakAnalysis) {
    parts.push(`检测到 ${peakAnalysis.peaks.length} 个谱峰`)
    if (peakAnalysis.overlaps.length > 0) {
      parts.push(`存在 ${peakAnalysis.overlaps.length} 处重叠峰`)
    }
  }

  if (balanceCalc) {
    parts.push(`配平方程式：${balanceCalc.balancedEquation}`)
    parts.push(`焓变 ΔH = ${balanceCalc.enthalpyChange} kJ/mol`)
  }

  const unresolvedLogs = traceLogs.filter((t) => !t.resolved)
  if (unresolvedLogs.length > 0) {
    parts.push(`存在 ${unresolvedLogs.length} 条待处理异常`)
  }

  const levelText = {
    usable: '数据可用',
    review: '需人工复核',
    reject: '数据不可用',
  }

  return `【${levelText[conclusionLevel]}】${parts.join('；')}`
}

export function buildReportPreview(
  record: WeighingRecord,
  peakAnalysis: PeakAnalysisResult | null,
  balanceCalc: BalanceCalcResult | null,
  traceLogs: TraceLog[],
): ReportPreview {
  const conclusionLevel = determineConclusionLevel(peakAnalysis, balanceCalc, traceLogs)
  const summary = generateSummary(conclusionLevel, peakAnalysis, balanceCalc, traceLogs)

  return {
    id: `report-${record.id}`,
    recordId: record.id,
    conclusionLevel,
    summary,
    peakAnalysis,
    balanceCalc,
    traceLogs,
    createdAt: new Date().toISOString(),
  }
}

export async function generatePDF(
  preview: ReportPreview,
  record: WeighingRecord,
): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument()
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    doc.fontSize(20).text('反应热安全分析报告', { align: 'center' })
    doc.moveDown()

    doc.fontSize(14).text(`批号：${record.batchNo}`)
    doc.text(`操作员：${record.operator}`)
    doc.text(`导入时间：${record.importedAt}`)
    doc.text(`状态：${record.status}`)
    doc.moveDown()

    const levelColor: Record<string, string> = {
      usable: '#22c55e',
      review: '#eab308',
      reject: '#ef4444',
    }
    const levelText: Record<string, string> = {
      usable: '数据可用',
      review: '需人工复核',
      reject: '数据不可用',
    }
    doc
      .fillColor(levelColor[preview.conclusionLevel])
      .fontSize(16)
      .text(`结论：${levelText[preview.conclusionLevel]}`)
    doc.fillColor('black')
    doc.moveDown()

    doc.fontSize(12).text(`摘要：${preview.summary}`)
    doc.moveDown()

    if (preview.peakAnalysis) {
      doc.fontSize(14).text('谱峰分析结果：')
      doc.fontSize(10).text(`检测到 ${preview.peakAnalysis.peaks.length} 个谱峰`)
      preview.peakAnalysis.peaks.forEach((peak, i) => {
        doc.text(
          `  峰${i + 1}: 时间=${peak.time.toFixed(2)}s, 温度=${peak.temperature.toFixed(2)}°C, 高度=${peak.height.toFixed(2)}°C`,
        )
      })
      if (preview.peakAnalysis.overlaps.length > 0) {
        doc.text(`重叠峰：${preview.peakAnalysis.overlaps.length} 处`)
      }
      doc.moveDown()
    }

    if (preview.balanceCalc) {
      doc.fontSize(14).text('配平计算结果：')
      doc.fontSize(10).text(`方程式：${preview.balanceCalc.balancedEquation}`)
      doc.text(`焓变 ΔH：${preview.balanceCalc.enthalpyChange} kJ/mol`)
      doc.text(`状态：${preview.balanceCalc.status}`)
      if (preview.balanceCalc.materialTrace.length > 0) {
        doc.text('材料追溯：')
        preview.balanceCalc.materialTrace.forEach((item) => {
          doc.text(
            `  ${item.reagentName} (批号${item.batchNo}): ${item.delta}`,
          )
        })
      }
      doc.moveDown()
    }

    if (preview.traceLogs.length > 0) {
      doc.fontSize(14).text('异常留痕：')
      doc.fontSize(10)
      preview.traceLogs.forEach((log) => {
        doc.text(`  [${log.severity}] ${log.message}`)
        doc.text(`    建议：${log.actionable}`)
      })
    }

    doc.end()
  })
}

export async function generateExcel(
  preview: ReportPreview,
  record: WeighingRecord,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  const infoSheet = workbook.addWorksheet('基本信息')
  infoSheet.columns = [
    { header: '项目', key: 'key', width: 20 },
    { header: '内容', key: 'value', width: 40 },
  ]
  infoSheet.addRow({ key: '批号', value: record.batchNo })
  infoSheet.addRow({ key: '操作员', value: record.operator })
  infoSheet.addRow({ key: '导入时间', value: record.importedAt })
  infoSheet.addRow({ key: '数据状态', value: record.status })
  infoSheet.addRow({ key: '结论', value: preview.conclusionLevel })
  infoSheet.addRow({ key: '摘要', value: preview.summary })

  if (record.rows) {
    const rowsSheet = workbook.addWorksheet('称量明细')
    rowsSheet.columns = [
      { header: '行号', key: 'rowIndex', width: 8 },
      { header: '试剂名称', key: 'reagentName', width: 20 },
      { header: '批号', key: 'batchNo', width: 20 },
      { header: '浓度(mol/L)', key: 'concentration', width: 15 },
      { header: '重量(g)', key: 'weight', width: 15 },
      { header: '纯度(%)', key: 'purity', width: 15 },
    ]
    record.rows.forEach((row) => rowsSheet.addRow(row))
  }

  if (preview.peakAnalysis) {
    const peakSheet = workbook.addWorksheet('谱峰分析')
    peakSheet.columns = [
      { header: '峰ID', key: 'id', width: 36 },
      { header: '时间(s)', key: 'time', width: 12 },
      { header: '温度(°C)', key: 'temperature', width: 12 },
      { header: '高度(°C)', key: 'height', width: 12 },
      { header: '宽度(s)', key: 'width', width: 12 },
    ]
    preview.peakAnalysis.peaks.forEach((peak) => peakSheet.addRow(peak))
  }

  if (preview.balanceCalc) {
    const balanceSheet = workbook.addWorksheet('配平计算')
    balanceSheet.columns = [
      { header: '项目', key: 'key', width: 20 },
      { header: '内容', key: 'value', width: 50 },
    ]
    balanceSheet.addRow({ key: '配平方程式', value: preview.balanceCalc.balancedEquation })
    balanceSheet.addRow({ key: '焓变 ΔH (kJ/mol)', value: preview.balanceCalc.enthalpyChange })
    balanceSheet.addRow({ key: '状态', value: preview.balanceCalc.status })

    const traceSheet = workbook.addWorksheet('材料追溯')
    traceSheet.columns = [
      { header: '试剂名称', key: 'reagentName', width: 20 },
      { header: '行号', key: 'sourceRow', width: 8 },
      { header: '批号', key: 'batchNo', width: 20 },
      { header: '浓度(mol/L)', key: 'concentration', width: 15 },
      { header: '纯度(%)', key: 'purity', width: 15 },
      { header: '偏差说明', key: 'delta', width: 40 },
    ]
    preview.balanceCalc.materialTrace.forEach((item) => traceSheet.addRow(item))
  }

  if (preview.traceLogs.length > 0) {
    const traceSheet = workbook.addWorksheet('异常留痕')
    traceSheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: '严重程度', key: 'severity', width: 12 },
      { header: '类型', key: 'type', width: 25 },
      { header: '消息', key: 'message', width: 40 },
      { header: '操作建议', key: 'actionable', width: 50 },
      { header: '是否解决', key: 'resolved', width: 10 },
    ]
    preview.traceLogs.forEach((log) => traceSheet.addRow(log))
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
