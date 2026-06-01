import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const { modelNo, status, dateFrom, dateTo } = req.query
    let sql = 'SELECT * FROM batch WHERE 1=1'
    const params: unknown[] = []

    if (modelNo) {
      sql += ' AND model_no = ?'
      params.push(modelNo)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (dateFrom) {
      sql += ' AND test_date >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      sql += ' AND test_date <= ?'
      params.push(dateTo)
    }

    sql += ' ORDER BY created_at DESC'

    const batches = db.prepare(sql).all(...params)
    res.json({ success: true, data: batches })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list batches' })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const { model_no, wind_tunnel_no, test_date } = req.body

    if (!model_no || !wind_tunnel_no || !test_date) {
      res.status(400).json({ success: false, error: 'model_no, wind_tunnel_no, and test_date are required' })
      return
    }

    const dateStr = test_date.replace(/-/g, '')
    const prefix = `WT-${dateStr}-`
    const existing = db.prepare("SELECT COUNT(*) as count FROM batch WHERE batch_no LIKE ?").get(`${prefix}%`) as { count: number }
    const batchNo = `${prefix}${String(existing.count + 1).padStart(3, '0')}`

    const id = uuidv4()
    db.prepare(
      'INSERT INTO batch (id, batch_no, model_no, wind_tunnel_no, test_date) VALUES (?, ?, ?, ?, ?)'
    ).run(id, batchNo, model_no, wind_tunnel_no, test_date)

    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: batch })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create batch' })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const materials = db.prepare('SELECT * FROM material WHERE batch_id = ?').all(req.params.id)
    const anomalyCount = db.prepare('SELECT COUNT(*) as count FROM anomaly WHERE batch_id = ?').get(req.params.id) as { count: number }

    res.json({
      success: true,
      data: {
        ...batch,
        materials,
        anomaly_count: anomalyCount.count
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get batch' })
  }
})

router.patch('/:id', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const { model_no, wind_tunnel_no, test_date } = req.body
    const updates: string[] = []
    const params: unknown[] = []

    if (model_no !== undefined) {
      updates.push('model_no = ?')
      params.push(model_no)
    }
    if (wind_tunnel_no !== undefined) {
      updates.push('wind_tunnel_no = ?')
      params.push(wind_tunnel_no)
    }
    if (test_date !== undefined) {
      updates.push('test_date = ?')
      params.push(test_date)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return
    }

    updates.push("updated_at = datetime('now')")
    params.push(req.params.id)

    db.prepare(`UPDATE batch SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update batch' })
  }
})

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const { toStatus, operator, note } = req.body
    const fromStatus = batch.status as string

    if (!toStatus) {
      res.status(400).json({ success: false, error: 'toStatus is required' })
      return
    }

    const openAnomalyCount = db.prepare(
      "SELECT COUNT(*) as count FROM anomaly WHERE batch_id = ? AND status = 'open'"
    ).get(req.params.id) as { count: number }

    const resolvedAnomalyCount = db.prepare(
      "SELECT COUNT(*) as count FROM anomaly WHERE batch_id = ? AND status = 'resolved'"
    ).get(req.params.id) as { count: number }

    const totalAnomalyCount = db.prepare(
      'SELECT COUNT(*) as count FROM anomaly WHERE batch_id = ?'
    ).get(req.params.id) as { count: number }

    if (fromStatus === 'pending_review' && toStatus === 'anomaly') {
      if (openAnomalyCount.count === 0) {
        res.status(400).json({ success: false, error: 'Cannot advance to anomaly: no open anomalies' })
        return
      }
    } else if (fromStatus === 'pending_review' && toStatus === 'completed') {
      if (totalAnomalyCount.count > 0) {
        res.status(400).json({ success: false, error: 'Cannot complete: anomalies exist' })
        return
      }
    } else if (fromStatus === 'anomaly' && toStatus === 'completed') {
      if (openAnomalyCount.count > 0) {
        res.status(400).json({ success: false, error: 'Cannot complete: unresolved anomalies remain' })
        return
      }
    } else {
      res.status(400).json({ success: false, error: `Invalid status transition: ${fromStatus} -> ${toStatus}` })
      return
    }

    db.prepare("UPDATE batch SET status = ?, updated_at = datetime('now') WHERE id = ?").run(toStatus, req.params.id)

    db.prepare(
      'INSERT INTO status_log (id, batch_id, from_status, to_status, operator, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), req.params.id, fromStatus, toStatus, operator || 'system', note || null)

    const updated = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update status' })
  }
})

export default router
