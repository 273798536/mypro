import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import * as xlsx from 'xlsx'
import path from 'path'
import os from 'os'
import { getDb } from '../db.js'

const router = Router()

const upload = multer({
  dest: path.join(os.tmpdir(), 'carbon-uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
})

interface ParsedRow {
  rowNumber: number
  data: Record<string, unknown>
}

interface DetectedBadRow {
  rowNumber: number
  rawContent: string
  reason: 'empty_row' | 'remark_row' | 'missing_column' | 'format_error'
}

const REQUIRED_MARGIN_COLUMNS = ['enterpriseCode', 'batchId', 'amount']
const REQUIRED_COMPLIANCE_COLUMNS = ['orderId', 'complianceTime']

function detectBadRows(rows: Record<string, unknown>[], requiredColumns: string[]): { validRows: ParsedRow[]; badRows: DetectedBadRow[] } {
  const validRows: ParsedRow[] = []
  const badRows: DetectedBadRow[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2

    const allValues = Object.values(row).map((v) => String(v ?? '').trim())
    const isEmpty = allValues.every((v) => v === '')
    if (isEmpty) {
      badRows.push({ rowNumber, rawContent: JSON.stringify(row), reason: 'empty_row' })
      return
    }

    const firstVal = allValues.find((v) => v !== '') || ''
    if (firstVal.startsWith('#') || firstVal.startsWith('//') || firstVal.startsWith('备注') || firstVal.startsWith('说明')) {
      badRows.push({ rowNumber, rawContent: JSON.stringify(row), reason: 'remark_row' })
      return
    }

    const missingCols = requiredColumns.filter((col) => {
      const val = row[col]
      return val === undefined || val === null || String(val).trim() === ''
    })
    if (missingCols.length > 0) {
      badRows.push({ rowNumber, rawContent: JSON.stringify(row), reason: 'missing_column' })
      return
    }

    if (row.amount !== undefined && isNaN(Number(row.amount))) {
      badRows.push({ rowNumber, rawContent: JSON.stringify(row), reason: 'format_error' })
      return
    }

    validRows.push({ rowNumber, data: row })
  })

  return { validRows, badRows }
}

function writeAudit(
  db: ReturnType<typeof getDb>,
  params: {
    entityType: string
    entityId: string
    action: string
    operator: string
    source: string
    sourceFile: string | null
    sourceLine: number | null
    beforeValue: Record<string, unknown> | null
    afterValue: Record<string, unknown> | null
  }
) {
  const stmt = db.prepare(
    `INSERT INTO audit_log (id, entity_type, entity_id, action, operator, source, source_file, source_line, before_value, after_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  )
  stmt.run(
    uuidv4(),
    params.entityType,
    params.entityId,
    params.action,
    params.operator,
    params.source,
    params.sourceFile,
    params.sourceLine,
    params.beforeValue ? JSON.stringify(params.beforeValue) : null,
    params.afterValue ? JSON.stringify(params.afterValue) : null
  )
}

router.post('/upload', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请上传文件' })
    return
  }

  const fileType = (req.body.fileType as string) || 'margin_flow'
  if (!['margin_flow', 'compliance_proof'].includes(fileType)) {
    res.status(400).json({ success: false, error: '无效的文件类型，支持: margin_flow, compliance_proof' })
    return
  }

  try {
    const workbook = xlsx.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const requiredColumns = fileType === 'margin_flow' ? REQUIRED_MARGIN_COLUMNS : REQUIRED_COMPLIANCE_COLUMNS
    const { validRows, badRows } = detectBadRows(rows, requiredColumns)

    const db = getDb()
    const taskId = uuidv4()

    const insertTask = db.prepare(
      `INSERT INTO import_task (id, file_name, file_type, total_rows, valid_rows, bad_rows, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'previewing', datetime('now'))`
    )
    insertTask.run(taskId, req.file.originalname || req.file.filename, fileType, rows.length, validRows.length, badRows.length)

    const insertBadRow = db.prepare(
      `INSERT INTO bad_row (id, import_task_id, row_number, raw_content, reason, handled, handle_action, created_at)
       VALUES (?, ?, ?, ?, ?, 0, null, datetime('now'))`
    )

    const insertBadRowTx = db.transaction(() => {
      for (const br of badRows) {
        insertBadRow.run(uuidv4(), taskId, br.rowNumber, br.rawContent, br.reason)
      }
    })
    insertBadRowTx()

    res.status(201).json({
      success: true,
      data: {
        taskId,
        fileName: req.file.originalname || req.file.filename,
        fileType,
        totalRows: rows.length,
        validRows: validRows.length,
        badRows: badRows.length,
        validData: validRows,
        badData: badRows,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件解析失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/:id/preview', (req: Request, res: Response): void => {
  const db = getDb()
  const task = db.prepare('SELECT * FROM import_task WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!task) {
    res.status(404).json({ success: false, error: '导入任务不存在' })
    return
  }

  const validRows = db.prepare('SELECT * FROM bad_row WHERE import_task_id = ? AND handle_action = \'restored\'').all(req.params.id)

  res.json({
    success: true,
    data: {
      task,
      previewRows: validRows,
    },
  })
})

router.get('/:id/bad-rows', (req: Request, res: Response): void => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM bad_row WHERE import_task_id = ?').all(req.params.id)

  res.json({ success: true, data: rows })
})

router.post('/:id/confirm', (req: Request, res: Response): void => {
  const db = getDb()
  const task = db.prepare('SELECT * FROM import_task WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!task) {
    res.status(404).json({ success: false, error: '导入任务不存在' })
    return
  }

  if ((task as Record<string, unknown>).status !== 'previewing') {
    res.status(400).json({ success: false, error: '任务已确认或已丢弃' })
    return
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE import_task SET status = 'confirmed' WHERE id = ?").run(req.params.id)

    writeAudit(db, {
      entityType: 'import',
      entityId: req.params.id,
      action: 'import',
      operator: 'admin',
      source: 'import',
      sourceFile: (task as Record<string, unknown>).file_name as string,
      sourceLine: null,
      beforeValue: null,
      afterValue: {
        status: 'confirmed',
        totalRows: (task as Record<string, unknown>).total_rows,
        validRows: (task as Record<string, unknown>).valid_rows,
        badRows: (task as Record<string, unknown>).bad_rows,
      },
    })
  })

  try {
    tx()
    res.json({ success: true, data: { message: '导入确认成功' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '确认导入失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.post('/bad-rows/:id/restore', (req: Request, res: Response): void => {
  const db = getDb()
  const badRow = db.prepare('SELECT * FROM bad_row WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!badRow) {
    res.status(404).json({ success: false, error: '坏行记录不存在' })
    return
  }

  const before = { ...badRow }

  db.prepare("UPDATE bad_row SET handled = 1, handle_action = 'restored' WHERE id = ?").run(req.params.id)

  writeAudit(db, {
    entityType: 'import',
    entityId: (badRow as Record<string, unknown>).import_task_id as string,
    action: 'update',
    operator: 'admin',
    source: 'manual',
    sourceFile: null,
    sourceLine: (badRow as Record<string, unknown>).row_number as number,
    beforeValue: before,
    afterValue: { ...before, handled: 1, handle_action: 'restored' },
  })

  res.json({ success: true, data: { message: '坏行已恢复' } })
})

router.post('/bad-rows/:id/discard', (req: Request, res: Response): void => {
  const db = getDb()
  const badRow = db.prepare('SELECT * FROM bad_row WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!badRow) {
    res.status(404).json({ success: false, error: '坏行记录不存在' })
    return
  }

  const before = { ...badRow }

  db.prepare("UPDATE bad_row SET handled = 1, handle_action = 'discarded' WHERE id = ?").run(req.params.id)

  writeAudit(db, {
    entityType: 'import',
    entityId: (badRow as Record<string, unknown>).import_task_id as string,
    action: 'delete',
    operator: 'admin',
    source: 'manual',
    sourceFile: null,
    sourceLine: (badRow as Record<string, unknown>).row_number as number,
    beforeValue: before,
    afterValue: { ...before, handled: 1, handle_action: 'discarded' },
  })

  res.json({ success: true, data: { message: '坏行已丢弃' } })
})

export default router
