import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/summary', (_req: Request, res: Response): void => {
  const typeCounts = db.prepare(
    `SELECT type, COUNT(*) as count FROM anomalies GROUP BY type`
  ).all() as { type: string; count: number }[]

  const statusCounts = db.prepare(
    `SELECT status, COUNT(*) as count FROM anomalies GROUP BY status`
  ).all() as { status: string; count: number }[]

  const suggestions = db.prepare(
    `SELECT type, suggestion, COUNT(*) as count FROM anomalies GROUP BY type, suggestion`
  ).all() as { type: string; suggestion: string; count: number }[]

  const typeMap: Record<string, { count: number; suggestion: string; suggestionDetail: string }> = {
    batch_mismatch: { count: 0, suggestion: '修改口径', suggestionDetail: '试剂批次与预期不一致，需修改实验口径' },
    boundary_unclear: { count: 0, suggestion: '补充材料', suggestionDetail: '采样地点缺失且批次不匹配，需补充材料' },
    data_missing: { count: 0, suggestion: '重新采样', suggestionDetail: '采样地点信息缺失，需重新采样' },
  }

  for (const tc of typeCounts) {
    if (typeMap[tc.type]) {
      typeMap[tc.type].count = tc.count
    }
  }

  res.json({
    success: true,
    data: {
      typeCounts: typeMap,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s.status] = s.count
        return acc
      }, {} as Record<string, number>),
      suggestions,
      total: typeCounts.reduce((sum, t) => sum + t.count, 0),
    },
  })
})

router.get('/', (req: Request, res: Response): void => {
  const { type, status, record_id } = req.query

  let sql = `SELECT a.*, c.animal_id, c.experiment_group, c.reagent_batch, c.expected_batch
             FROM anomalies a
             JOIN culture_records c ON a.record_id = c.id
             WHERE 1=1`
  const params: unknown[] = []

  if (type) {
    sql += ' AND a.type = ?'
    params.push(type)
  }
  if (status) {
    sql += ' AND a.status = ?'
    params.push(status)
  }
  if (record_id) {
    sql += ' AND a.record_id = ?'
    params.push(record_id)
  }

  sql += ' ORDER BY a.created_at DESC'

  const anomalies = db.prepare(sql).all(...params)
  res.json({ success: true, data: anomalies })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { status } = req.body

  const validStatuses = ['pending', 'resolved', 'ignored', 'escalated']
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: '无效的状态值，可选: pending, resolved, ignored, escalated' })
    return
  }

  const existing = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '异常记录不存在' })
    return
  }

  const resolvedAt = status === 'resolved'
    ? new Date().toISOString().slice(0, 19).replace('T', ' ')
    : null

  db.prepare('UPDATE anomalies SET status = ?, resolved_at = ? WHERE id = ?')
    .run(status, resolvedAt, req.params.id)

  if (status === 'resolved') {
    const anomaly = db.prepare('SELECT record_id FROM anomalies WHERE id = ?').get(req.params.id) as { record_id: number } | undefined
    if (anomaly) {
      const pendingCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM anomalies WHERE record_id = ? AND status = ?'
      ).get(anomaly.record_id, 'pending') as { cnt: number }

      if (pendingCount.cnt === 0) {
        const hasAnyAnomaly = db.prepare(
          'SELECT COUNT(*) as cnt FROM anomalies WHERE record_id = ? AND status != ?'
        ).get(anomaly.record_id, 'ignored') as { cnt: number }

        if (hasAnyAnomaly.cnt === 0) {
          db.prepare("UPDATE culture_records SET status = 'normal', updated_at = datetime('now') WHERE id = ?")
            .run(anomaly.record_id)
        } else {
          db.prepare("UPDATE culture_records SET status = 'pending_review', updated_at = datetime('now') WHERE id = ?")
            .run(anomaly.record_id)
        }
      }
    }
  }

  const updated = db.prepare('SELECT * FROM anomalies WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
