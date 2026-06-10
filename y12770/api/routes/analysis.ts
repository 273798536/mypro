import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/database.js'
import { detectPeaks } from '../services/peakService.js'
import { createTraceLog, saveTraceLog } from '../services/errorService.js'
import type {
  ApiResponse,
  PeakAnalysisResult,
  Peak,
  OverlapRegion,
} from '../types/index.js'

const router = Router()

router.post('/run/:recordId', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params
    const { temperatureCurve } = req.body as { temperatureCurve: number[][] }

    const recordStmt = db.prepare('SELECT * FROM weighing_records WHERE id = ?')
    const record = recordStmt.get(recordId) as { id: string; batch_no: string } | undefined

    if (!record) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: `未找到 ID 为 ${recordId} 的称量单记录`,
          actionable: '请先导入称量单，或选择正确的记录进行谱峰分析',
        },
      }
      return res.status(404).json(response)
    }

    if (!temperatureCurve || !Array.isArray(temperatureCurve) || temperatureCurve.length === 0) {
      const log = createTraceLog('MISSING_CURVE', 'high', {
        recordId,
        batchNo: record.batch_no,
      })
      saveTraceLog(log)

      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'CURVE_MISSING',
          message: '温度曲线数据缺失',
          actionable: log.actionable,
        },
      }
      return res.status(400).json(response)
    }

    const { peaks, overlaps, warnings } = detectPeaks(temperatureCurve)
    const analysisId = uuidv4()

    const insertStmt = db.prepare(`
      INSERT INTO peak_analysis (id, record_id, peaks_json, overlaps_json, warnings_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertStmt.run(
      analysisId,
      recordId,
      JSON.stringify(peaks),
      JSON.stringify(overlaps),
      JSON.stringify(warnings),
      new Date().toISOString(),
    )

    if (overlaps.length > 0) {
      const log = createTraceLog('PEAK_UNCERTAIN', 'medium', {
        recordId,
        batchNo: record.batch_no,
      }, `检测到 ${overlaps.length} 处重叠峰`)
      saveTraceLog(log)
    }

    const result: PeakAnalysisResult = {
      id: analysisId,
      recordId,
      peaks,
      overlaps,
      warnings,
      createdAt: new Date().toISOString(),
    }

    const response: ApiResponse<PeakAnalysisResult> = {
      success: true,
      data: result,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : '谱峰分析失败',
        actionable: '请检查温度曲线数据格式是否正确，应为 [[time, temp], ...] 格式',
      },
    }
    res.status(500).json(response)
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const stmt = db.prepare('SELECT * FROM peak_analysis WHERE id = ?')
    const analysis = stmt.get(id) as {
      id: string
      record_id: string
      peaks_json: string
      overlaps_json: string
      warnings_json: string
      created_at: string
    } | undefined

    if (!analysis) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的谱峰分析结果`,
          actionable: '请先运行谱峰分析，或选择正确的分析记录',
        },
      }
      return res.status(404).json(response)
    }

    const result: PeakAnalysisResult = {
      id: analysis.id,
      recordId: analysis.record_id,
      peaks: JSON.parse(analysis.peaks_json || '[]') as Peak[],
      overlaps: JSON.parse(analysis.overlaps_json || '[]') as OverlapRegion[],
      warnings: JSON.parse(analysis.warnings_json || '[]') as string[],
      createdAt: analysis.created_at,
    }

    const response: ApiResponse<PeakAnalysisResult> = {
      success: true,
      data: result,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'GET_FAILED',
        message: '获取谱峰分析结果失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

router.put('/:id/peaks', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { peaks, overlaps } = req.body as { peaks?: Peak[]; overlaps?: OverlapRegion[] }

    const checkStmt = db.prepare('SELECT * FROM peak_analysis WHERE id = ?')
    const existing = checkStmt.get(id) as { id: string } | undefined

    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的谱峰分析结果`,
          actionable: '请先运行谱峰分析，再进行人工调整',
        },
      }
      return res.status(404).json(response)
    }

    if (peaks) {
      const updateStmt = db.prepare('UPDATE peak_analysis SET peaks_json = ? WHERE id = ?')
      updateStmt.run(JSON.stringify(peaks), id)
    }

    if (overlaps) {
      const updateStmt = db.prepare('UPDATE peak_analysis SET overlaps_json = ? WHERE id = ?')
      updateStmt.run(JSON.stringify(overlaps), id)
    }

    const stmt = db.prepare('SELECT * FROM peak_analysis WHERE id = ?')
    const analysis = stmt.get(id) as {
      id: string
      record_id: string
      peaks_json: string
      overlaps_json: string
      warnings_json: string
      created_at: string
    }

    const result: PeakAnalysisResult = {
      id: analysis.id,
      recordId: analysis.record_id,
      peaks: JSON.parse(analysis.peaks_json || '[]') as Peak[],
      overlaps: JSON.parse(analysis.overlaps_json || '[]') as OverlapRegion[],
      warnings: JSON.parse(analysis.warnings_json || '[]') as string[],
      createdAt: analysis.created_at,
    }

    const response: ApiResponse<PeakAnalysisResult> = {
      success: true,
      data: result,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'UPDATE_FAILED',
        message: '更新谱峰数据失败',
        actionable: '请检查数据格式是否正确，或稍后重试',
      },
    }
    res.status(500).json(response)
  }
})

export default router
