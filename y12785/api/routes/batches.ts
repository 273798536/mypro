import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router()

const VALID_STATUSES = ['imported', 'analyzing', 'pending_review', 'approved', 'rejected', 'exported']
const STATUS_TRANSITIONS: Record<string, string[]> = {
  imported: ['analyzing'],
  analyzing: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  approved: ['exported'],
  rejected: ['pending_review'],
  exported: [],
}

router.post('/', (req: Request, res: Response): void => {
  const { batch_no, weighing_precision } = req.body
  if (!batch_no) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少必填字段',
      actionableHint: '请提供 batch_no 字段',
      missingData: ['batch_no'],
    })
    return
  }

  const existing = db.prepare('SELECT id FROM batches WHERE batch_no = ?').get(batch_no)
  if (existing) {
    res.status(409).json({
      code: 'DUPLICATE_BATCH',
      message: '批次号已存在',
      actionableHint: '请使用不同的批次号',
    })
    return
  }

  const id = crypto.randomUUID()
  const precision = weighing_precision || '0.1mg'

  db.prepare(
    'INSERT INTO batches (id, batch_no, weighing_precision) VALUES (?, ?, ?)'
  ).run(id, batch_no, precision)

  logOperation(id, 'CREATE_BATCH', req.body.operator || 'system', `创建批次: ${batch_no}`)

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: batch })
})

router.get('/', (req: Request, res: Response): void => {
  const { status, page = '1', limit = '20' } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  let rows: any[]
  let total: number

  if (status) {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM batches WHERE status = ?').get(status as string) as any
    total = countRow.count
    rows = db.prepare('SELECT * FROM batches WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(status, limitNum, offset)
  } else {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM batches').get() as any
    total = countRow.count
    rows = db.prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limitNum, offset)
  }

  res.json({
    success: true,
    data: { items: rows, total, page: pageNum, limit: limitNum },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id) as Record<string, any> | undefined
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const spectra = db.prepare('SELECT * FROM spectrum_pages WHERE batch_id = ? ORDER BY page_number').all(req.params.id)
  const attributions = db.prepare('SELECT * FROM fragment_attributions WHERE batch_id = ?').all(req.params.id)
  const concentration = db.prepare('SELECT * FROM concentration_results WHERE batch_id = ?').get(req.params.id)
  const temperatures = db.prepare('SELECT * FROM temperature_records WHERE batch_id = ? ORDER BY timestamp').all(req.params.id)
  const reviews = db.prepare('SELECT * FROM review_records WHERE batch_id = ? ORDER BY reviewed_at DESC').all(req.params.id)

  res.json({
    success: true,
    data: { ...batch, spectra, attributions, concentration, temperatures, reviews },
  })
})

router.patch('/:id/status', (req: Request, res: Response): void => {
  const { status, operator } = req.body
  if (!status) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少状态字段',
      actionableHint: '请提供 status 字段',
      missingData: ['status'],
    })
    return
  }

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id) as any
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({
      code: 'INVALID_STATUS',
      message: '无效的状态值',
      actionableHint: `状态必须是以下值之一: ${VALID_STATUSES.join(', ')}`,
    })
    return
  }

  const allowed = STATUS_TRANSITIONS[batch.status] || []
  if (!allowed.includes(status)) {
    res.status(409).json({
      code: 'INVALID_TRANSITION',
      message: `不允许从 ${batch.status} 转换到 ${status}`,
      actionableHint: `当前状态 ${batch.status} 允许的转换: ${allowed.join(', ') || '无'}`,
    })
    return
  }

  db.prepare(
    "UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, req.params.id)

  logOperation(req.params.id, 'STATUS_CHANGE', operator || 'system', `状态从 ${batch.status} 变更为 ${status}`)

  if (status === 'exported') {
    logOperation(req.params.id, 'EXPORT', operator || 'system', '批次已导出')
  }

  const updated = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
