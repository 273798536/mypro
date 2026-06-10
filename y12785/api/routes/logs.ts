import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { action, page = '1', limit = '50' } = req.query

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  let rows: any[]
  let total: number

  if (action) {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE batch_id = ? AND action = ?').get(batchId, action) as any
    total = countRow.count
    rows = db.prepare('SELECT * FROM operation_logs WHERE batch_id = ? AND action = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(batchId, action, limitNum, offset)
  } else {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE batch_id = ?').get(batchId) as any
    total = countRow.count
    rows = db.prepare('SELECT * FROM operation_logs WHERE batch_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(batchId, limitNum, offset)
  }

  res.json({
    success: true,
    data: { items: rows, total, page: pageNum, limit: limitNum },
  })
})

export default router
