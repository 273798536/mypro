import { Router, type Request, type Response } from 'express'
import { db } from '../db/database.js'
import { buildReportPreview, generatePDF, generateExcel } from '../services/reportService.js'
import { getTraceLogsByRecordId } from '../services/errorService.js'
import type {
  ApiResponse,
  ReportPreview,
  WeighingRecord,
  WeighingRow,
  PeakAnalysisResult,
  BalanceCalcResult,
  Peak,
  OverlapRegion,
  MaterialTraceItem,
  RecordStatus,
} from '../types/index.js'

const router = Router()

function getFullRecord(recordId: string): WeighingRecord | null {
  const recordStmt = db.prepare('SELECT * FROM weighing_records WHERE id = ?')
  const record = recordStmt.get(recordId) as {
    id: string
    batch_no: string
    operator: string
    filename: string
    status: RecordStatus
    imported_at: string
  } | undefined

  if (!record) return null

  const rowsStmt = db.prepare('SELECT * FROM weighing_rows WHERE record_id = ? ORDER BY row_index ASC')
  const rowData = rowsStmt.all(recordId) as Array<{
    id: number
    record_id: string
    row_index: number
    reagent_name: string
    batch_no: string
    concentration: number
    weight: number
    purity: number
  }>

  const rows: WeighingRow[] = rowData.map((r) => ({
    id: r.id,
    recordId: r.record_id,
    rowIndex: r.row_index,
    reagentName: r.reagent_name,
    batchNo: r.batch_no,
    concentration: r.concentration,
    weight: r.weight,
    purity: r.purity,
  }))

  return {
    id: record.id,
    batchNo: record.batch_no,
    operator: record.operator,
    filename: record.filename,
    status: record.status,
    importedAt: record.imported_at,
    rows,
  }
}

function getPeakAnalysis(recordId: string): PeakAnalysisResult | null {
  const stmt = db.prepare('SELECT * FROM peak_analysis WHERE record_id = ? ORDER BY created_at DESC LIMIT 1')
  const analysis = stmt.get(recordId) as {
    id: string
    record_id: string
    peaks_json: string
    overlaps_json: string
    warnings_json: string
    created_at: string
  } | undefined

  if (!analysis) return null

  return {
    id: analysis.id,
    recordId: analysis.record_id,
    peaks: JSON.parse(analysis.peaks_json || '[]') as Peak[],
    overlaps: JSON.parse(analysis.overlaps_json || '[]') as OverlapRegion[],
    warnings: JSON.parse(analysis.warnings_json || '[]') as string[],
    createdAt: analysis.created_at,
  }
}

function getBalanceCalc(recordId: string): BalanceCalcResult | null {
  const stmt = db.prepare('SELECT * FROM balance_calc WHERE record_id = ? ORDER BY created_at DESC LIMIT 1')
  const calc = stmt.get(recordId) as {
    id: string
    record_id: string
    equation: string
    enthalpy_change: number
    status: RecordStatus
    created_at: string
  } | undefined

  if (!calc) return null

  const traceStmt = db.prepare('SELECT * FROM material_trace WHERE calc_id = ?')
  const traceData = traceStmt.all(calc.id) as Array<{
    id: number
    calc_id: string
    row_id: number | null
    reagent_name: string
    expected_conc: number
    actual_conc: number
    delta_desc: string
  }>

  const materialTrace: MaterialTraceItem[] = traceData.map((t) => ({
    reagentName: t.reagent_name,
    sourceRow: t.row_id || 0,
    batchNo: '',
    concentration: t.actual_conc,
    purity: 0,
    delta: t.delta_desc,
  }))

  return {
    id: calc.id,
    recordId: calc.record_id,
    balancedEquation: calc.equation,
    enthalpyChange: calc.enthalpy_change,
    materialTrace,
    status: calc.status,
    createdAt: calc.created_at,
  }
}

router.get('/:id/preview', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const record = getFullRecord(id)

    if (!record) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的称量单记录`,
          actionable: '请检查记录 ID 是否正确，或返回列表页重新选择',
        },
      }
      return res.status(404).json(response)
    }

    const peakAnalysis = getPeakAnalysis(id)
    const balanceCalc = getBalanceCalc(id)
    const traceLogs = getTraceLogsByRecordId(id)

    const preview = buildReportPreview(record, peakAnalysis, balanceCalc, traceLogs)

    const reportStmt = db.prepare(`
      INSERT OR REPLACE INTO reports (id, record_id, conclusion_level, preview_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    reportStmt.run(
      preview.id,
      id,
      preview.conclusionLevel,
      JSON.stringify(preview),
      preview.createdAt,
    )

    const response: ApiResponse<ReportPreview> = {
      success: true,
      data: preview,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'PREVIEW_FAILED',
        message: '生成报告预览失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { format } = req.query as { format?: string }
    const downloadFormat = format?.toLowerCase() === 'excel' ? 'excel' : 'pdf'

    const record = getFullRecord(id)
    if (!record) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的称量单记录`,
          actionable: '请检查记录 ID 是否正确，或返回列表页重新选择',
        },
      }
      return res.status(404).json(response)
    }

    const peakAnalysis = getPeakAnalysis(id)
    const balanceCalc = getBalanceCalc(id)
    const traceLogs = getTraceLogsByRecordId(id)
    const preview = buildReportPreview(record, peakAnalysis, balanceCalc, traceLogs)

    if (downloadFormat === 'excel') {
      const buffer = await generateExcel(preview, record)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="report_${record.batchNo}.xlsx"`)
      return res.send(buffer)
    }

    const buffer = await generatePDF(preview, record)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="report_${record.batchNo}.pdf"`)
    res.send(buffer)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: '下载报告失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

export default router
