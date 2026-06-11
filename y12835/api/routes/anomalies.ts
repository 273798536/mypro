import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import type { AnomalyListQuery, ReviewRequest, AnomalyReview } from '../types.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { review_status, anomaly_type } = req.query as AnomalyListQuery

  const conditions: string[] = []
  const params: unknown[] = []

  if (review_status) { conditions.push('review_status = ?'); params.push(review_status) }
  if (anomaly_type) { conditions.push('anomaly_type = ?'); params.push(anomaly_type) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const reviews = db.prepare(`SELECT * FROM anomaly_reviews ${where} ORDER BY created_at DESC`).all(...params) as AnomalyReview[]

  const result = reviews.map(review => {
    const links = db.prepare('SELECT source_record_id FROM anomaly_source_links WHERE anomaly_id = ?').all(review.id) as { source_record_id: string }[]
    return {
      ...review,
      source_material_ids: links.map(l => l.source_record_id),
    }
  })

  res.json({ success: true, data: result })
})

router.put('/:id/review', (req: Request, res: Response): void => {
  const db = getDb()
  const { reviewer, review_comment, review_status } = req.body as ReviewRequest

  if (!reviewer || !review_comment || !review_status) {
    res.status(400).json({ success: false, error: '缺少必填字段，请提供reviewer、review_comment、review_status' })
    return
  }

  if (!['approved', 'rejected'].includes(review_status)) {
    res.status(400).json({ success: false, error: 'review_status必须为approved或rejected' })
    return
  }

  const existing = db.prepare('SELECT * FROM anomaly_reviews WHERE id = ?').get(req.params.id) as AnomalyReview | undefined
  if (!existing) {
    res.status(404).json({ success: false, error: '未找到该异常复核记录' })
    return
  }

  const now = new Date().toISOString()
  db.prepare(
    `UPDATE anomaly_reviews SET reviewer = ?, review_comment = ?, review_status = ?, reviewed_at = ? WHERE id = ?`
  ).run(reviewer, review_comment, review_status, now, req.params.id)

  if (review_status === 'approved') {
    db.prepare("UPDATE cryo_records SET status = 'reviewed_ok' WHERE id = ?").run(existing.record_id)
  } else if (review_status === 'rejected') {
    db.prepare("UPDATE cryo_records SET status = 'reviewed_failed' WHERE id = ?").run(existing.record_id)
  }

  const updated = db.prepare('SELECT * FROM anomaly_reviews WHERE id = ?').get(req.params.id) as AnomalyReview
  const links = db.prepare('SELECT source_record_id FROM anomaly_source_links WHERE anomaly_id = ?').all(req.params.id) as { source_record_id: string }[]

  res.json({
    success: true,
    data: { ...updated, source_material_ids: links.map(l => l.source_record_id) },
  })
})

export default router
