import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import { db } from '../db/database.js'
import { parseWeighingFile, validateWeighingData } from '../services/fileService.js'
import { validateRecordAndCreateLogs, saveTraceLog } from '../services/errorService.js'
import type {
  ApiResponse,
  WeighingRecord,
  WeighingRow,
  WeighingImportResponse,
  RecordStatus,
} from '../types/index.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'FILE_MISSING',
          message: '未找到上传的文件',
          actionable: '请选择 CSV 或 Excel 格式的称量单文件后再上传',
        },
      }
      return res.status(400).json(response)
    }

    const rows = parseWeighingFile(req.file)
    const validation = validateWeighingData(rows)
    const recordId = uuidv4()

    const batchNo = rows[0]?.batchNo || `BATCH-${Date.now()}`
    const status: RecordStatus = validation.isValid ? 'pending' : 'bad'

    const insertRecordStmt = db.prepare(`
      INSERT INTO weighing_records (id, batch_no, operator, filename, status, imported_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertRecordStmt.run(
      recordId,
      batchNo,
      'system',
      req.file.originalname,
      status,
      new Date().toISOString(),
    )

    const insertRowStmt = db.prepare(`
      INSERT INTO weighing_rows (record_id, row_index, reagent_name, batch_no, concentration, weight, purity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    rows.forEach((row) =>
      insertRowStmt.run(
        recordId,
        row.rowIndex,
        row.reagentName,
        row.batchNo,
        row.concentration,
        row.weight,
        row.purity,
      ),
    )

    const tempRecord = { id: recordId, batchNo, operator: 'system', filename: req.file.originalname, status, importedAt: new Date().toISOString() }
    const logs = validateRecordAndCreateLogs(tempRecord, rows)
    logs.forEach(saveTraceLog)

    const response: ApiResponse<WeighingImportResponse> = {
      success: true,
      data: {
        recordId,
        validation,
        previewData: rows,
      },
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : '文件导入失败',
        actionable: '请检查文件格式是否正确，支持 CSV 和 Excel 格式',
      },
    }
    res.status(500).json(response)
  }
})

router.get('/list', (req: Request, res: Response) => {
  try {
    const { status } = req.query
    let sql = 'SELECT * FROM weighing_records'
    const params: string[] = []
    if (status && typeof status === 'string' && ['success', 'pending', 'bad'].includes(status)) {
      sql += ' WHERE status = ?'
      params.push(status)
    }
    sql += ' ORDER BY imported_at DESC'

    const stmt = db.prepare(sql)
    const records = stmt.all(...params) as Array<{
      id: string
      batch_no: string
      operator: string
      filename: string
      status: RecordStatus
      imported_at: string
    }>

    const result: WeighingRecord[] = records.map((r) => ({
      id: r.id,
      batchNo: r.batch_no,
      operator: r.operator,
      filename: r.filename,
      status: r.status,
      importedAt: r.imported_at,
    }))

    const response: ApiResponse<WeighingRecord[]> = {
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
        code: 'LIST_FAILED',
        message: '获取称量单列表失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const recordStmt = db.prepare('SELECT * FROM weighing_records WHERE id = ?')
    const record = recordStmt.get(id) as {
      id: string
      batch_no: string
      operator: string
      filename: string
      status: RecordStatus
      imported_at: string
    } | undefined

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

    const rowsStmt = db.prepare('SELECT * FROM weighing_rows WHERE record_id = ? ORDER BY row_index ASC')
    const rowData = rowsStmt.all(id) as Array<{
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

    const result: WeighingRecord = {
      id: record.id,
      batchNo: record.batch_no,
      operator: record.operator,
      filename: record.filename,
      status: record.status,
      importedAt: record.imported_at,
      rows,
    }

    const response: ApiResponse<WeighingRecord> = {
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
        message: '获取称量单详情失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

export default router
