import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const { type, status, batchId, modelNo } = req.query
    let sql = 'SELECT a.* FROM anomaly a JOIN batch b ON a.batch_id = b.id WHERE 1=1'
    const params: unknown[] = []

    if (type) {
      sql += ' AND a.type = ?'
      params.push(type)
    }
    if (status) {
      sql += ' AND a.status = ?'
      params.push(status)
    }
    if (batchId) {
      sql += ' AND a.batch_id = ?'
      params.push(batchId)
    }
    if (modelNo) {
      sql += ' AND b.model_no = ?'
      params.push(modelNo)
    }

    sql += ' ORDER BY a.created_at DESC'

    const anomalies = db.prepare(sql).all(...params)
    res.json({ success: true, data: anomalies })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list anomalies' })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const anomaly = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!anomaly) {
      res.status(404).json({ success: false, error: 'Anomaly not found' })
      return
    }

    const material = db.prepare('SELECT * FROM material WHERE id = ?').get((anomaly as Record<string, unknown>).material_id)
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get((anomaly as Record<string, unknown>).batch_id)

    res.json({
      success: true,
      data: {
        ...anomaly,
        material,
        batch
      }
    })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get anomaly' })
  }
})

router.patch('/:id', (req: Request, res: Response) => {
  try {
    const anomaly = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(req.params.id)
    if (!anomaly) {
      res.status(404).json({ success: false, error: 'Anomaly not found' })
      return
    }

    const { resolution, zero_correction_spec, status } = req.body
    const updates: string[] = []
    const params: unknown[] = []

    if (resolution !== undefined) {
      updates.push('resolution = ?')
      params.push(resolution)
    }
    if (zero_correction_spec !== undefined) {
      updates.push('zero_correction_spec = ?')
      params.push(zero_correction_spec)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return
    }

    params.push(req.params.id)
    db.prepare(`UPDATE anomaly SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update anomaly' })
  }
})

router.patch('/:id/resolve', (req: Request, res: Response) => {
  try {
    const anomaly = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!anomaly) {
      res.status(404).json({ success: false, error: 'Anomaly not found' })
      return
    }

    if (anomaly.status === 'resolved') {
      res.status(400).json({ success: false, error: 'Anomaly already resolved' })
      return
    }

    const { resolution, zero_correction_spec } = req.body

    db.prepare(
      "UPDATE anomaly SET status = 'resolved', resolved_at = datetime('now'), resolution = ?, zero_correction_spec = ? WHERE id = ?"
    ).run(resolution || null, zero_correction_spec || null, req.params.id)

    const updated = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to resolve anomaly' })
  }
})

export default router
