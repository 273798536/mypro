import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/batches/:batchId/reads', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { lowQuality } = req.query

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }

  let rows: any[]
  if (lowQuality === 'true') {
    rows = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ? AND is_low_quality = 1 ORDER BY read_id').all(batchId)
  } else {
    rows = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ? ORDER BY read_id').all(batchId)
  }
  res.json({ success: true, data: rows })
})

router.get('/:batchId/reads', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { lowQuality } = req.query

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({ success: false, error: '批次未找到' })
    return
  }

  let rows: any[]
  if (lowQuality === 'true') {
    rows = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ? AND is_low_quality = 1 ORDER BY read_id').all(batchId)
  } else {
    rows = db.prepare('SELECT * FROM read_qualities WHERE batch_id = ? ORDER BY read_id').all(batchId)
  }
  res.json({ success: true, data: rows })
})

export default router

export const readRootRoutes = Router()

readRootRoutes.get('/reads/:readId', (req: Request, res: Response): void => {
  const row = db.prepare('SELECT * FROM read_qualities WHERE id = ?').get(req.params.readId)
  if (!row) {
    res.status(404).json({ success: false, error: '读段记录未找到' })
    return
  }
  res.json({ success: true, data: row })
})
