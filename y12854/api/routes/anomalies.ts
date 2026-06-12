import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { type, status, sampleId } = req.query

    let sql = 'SELECT * FROM anomaly WHERE 1=1'
    const params: unknown[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (sampleId) {
      sql += ' AND sample_id = ?'
      params.push(sampleId)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

    const anomalies = rows.map((a) => ({
      id: a.id,
      sampleId: a.sample_id,
      type: a.type,
      status: a.status,
      description: a.description,
      resolution: a.resolution,
      createdAt: a.created_at,
      resolvedAt: a.resolved_at,
    }))

    res.json({ success: true, data: anomalies })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取异常列表失败' })
  }
})

router.patch('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { resolution } = req.body as { resolution?: string }

    const anomaly = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id) as Record<string, unknown> | undefined

    if (!anomaly) {
      res.status(404).json({ success: false, error: '异常记录不存在' })
      return
    }

    if (anomaly.status === 'resolved') {
      res.status(400).json({ success: false, error: '该异常已解决' })
      return
    }

    if (!resolution || resolution.trim() === '') {
      res.status(400).json({ success: false, error: '请提供解决说明' })
      return
    }

    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE anomaly SET status = 'resolved', resolution = ?, resolved_at = ?
        WHERE id = ?
      `).run(resolution, now, id)

      db.prepare(`
        INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), 'anomaly_resolved', 'anomaly', id,
        `异常已解决，类型: ${anomaly.type}，解决说明: ${resolution}`,
        '操作员', now
      )
    })

    transaction()

    const updated = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id) as Record<string, unknown>

    res.json({
      success: true,
      data: {
        id: updated.id,
        sampleId: updated.sample_id,
        type: updated.type,
        status: updated.status,
        description: updated.description,
        resolution: updated.resolution,
        createdAt: updated.created_at,
        resolvedAt: updated.resolved_at,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '解决异常失败' })
  }
})

export default router
