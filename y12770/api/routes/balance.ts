import { Router, type Request, type Response } from 'express'
import { db } from '../db/database.js'
import { calculateBalance } from '../services/balanceService.js'
import { createTraceLog, saveTraceLog } from '../services/errorService.js'
import type {
  ApiResponse,
  BalanceCalcResult,
  BalanceCalcRequest,
  MaterialTraceItem,
  WeighingRow,
  RecordStatus,
} from '../types/index.js'

const router = Router()

router.post('/calculate/:recordId', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params
    const { reactants, products } = req.body as BalanceCalcRequest

    const recordStmt = db.prepare('SELECT * FROM weighing_records WHERE id = ?')
    const record = recordStmt.get(recordId) as { id: string; batch_no: string } | undefined

    if (!record) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: `未找到 ID 为 ${recordId} 的称量单记录`,
          actionable: '请先导入称量单，再进行配平计算',
        },
      }
      return res.status(404).json(response)
    }

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

    if (!reactants || !products || reactants.length === 0 || products.length === 0) {
      const log = createTraceLog('BALANCE_FAILED', 'high', {
        recordId,
        batchNo: record.batch_no,
      }, '反应物或生成物为空，无法配平')
      saveTraceLog(log)

      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'MISSING_FORMULA',
          message: '反应物或生成物分子式未提供',
          actionable: log.actionable,
        },
      }
      return res.status(400).json(response)
    }

    const result = calculateBalance(recordId, reactants, products, rows)

    const insertStmt = db.prepare(`
      INSERT INTO balance_calc (id, record_id, equation, enthalpy_change, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertStmt.run(
      result.calcId,
      recordId,
      result.balancedEquation,
      result.enthalpyChange,
      result.status,
      new Date().toISOString(),
    )

    const insertTraceStmt = db.prepare(`
      INSERT INTO material_trace (calc_id, row_id, reagent_name, expected_conc, actual_conc, delta_desc)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    result.materialTrace.forEach((item, idx) => {
      insertTraceStmt.run(
        result.calcId,
        rowData[idx]?.id || null,
        item.reagentName,
        item.concentration,
        item.concentration,
        item.delta,
      )
    })

    if (result.status === 'bad') {
      const log = createTraceLog('CONCENTRATION_ERROR', 'high', {
        recordId,
        batchNo: record.batch_no,
      }, '材料追溯发现浓度偏差超过阈值')
      saveTraceLog(log)
    }

    const responseData: BalanceCalcResult = {
      id: result.calcId,
      recordId,
      balancedEquation: result.balancedEquation,
      enthalpyChange: result.enthalpyChange,
      materialTrace: result.materialTrace,
      status: result.status,
      createdAt: new Date().toISOString(),
    }

    const response: ApiResponse<BalanceCalcResult> = {
      success: true,
      data: responseData,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'BALANCE_FAILED',
        message: error instanceof Error ? error.message : '配平计算失败',
        actionable: '请检查化学分子式是否正确，确保元素种类和数量合理',
      },
    }
    res.status(500).json(response)
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const stmt = db.prepare('SELECT * FROM balance_calc WHERE id = ?')
    const calc = stmt.get(id) as {
      id: string
      record_id: string
      equation: string
      enthalpy_change: number
      status: RecordStatus
      created_at: string
    } | undefined

    if (!calc) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'CALC_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的配平计算结果`,
          actionable: '请先运行配平计算，或选择正确的计算记录',
        },
      }
      return res.status(404).json(response)
    }

    const traceStmt = db.prepare('SELECT * FROM material_trace WHERE calc_id = ?')
    const traceData = traceStmt.all(id) as Array<{
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

    const result: BalanceCalcResult = {
      id: calc.id,
      recordId: calc.record_id,
      balancedEquation: calc.equation,
      enthalpyChange: calc.enthalpy_change,
      materialTrace,
      status: calc.status,
      createdAt: calc.created_at,
    }

    const response: ApiResponse<BalanceCalcResult> = {
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
        message: '获取配平计算结果失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

export default router
