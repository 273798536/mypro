import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router({ mergeParams: true })

router.post('/', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { reviewer, decision, comment, target_item_id, operator } = req.body

  if (!reviewer || !decision) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少必填字段',
      actionableHint: '请提供 reviewer 和 decision 字段',
      missingData: ['reviewer', 'decision'].filter(f => !(f in req.body)),
    })
    return
  }

  const validDecisions = ['approved', 'rejected', 'needs_revision']
  if (!validDecisions.includes(decision)) {
    res.status(400).json({
      code: 'INVALID_DECISION',
      message: '无效的复核决定',
      actionableHint: `decision 必须是以下值之一: ${validDecisions.join(', ')}`,
    })
    return
  }

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO review_records (id, batch_id, reviewer, decision, comment, target_item_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, batchId, reviewer, decision, comment || null, target_item_id || null)

  logOperation(batchId, 'SUBMIT_REVIEW', operator || reviewer, `复核意见: ${decision}${comment ? `, 备注: ${comment}` : ''}`)

  const record = db.prepare('SELECT * FROM review_records WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: record })
})

router.get('/', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const reviews = db.prepare('SELECT * FROM review_records WHERE batch_id = ? ORDER BY reviewed_at DESC').all(batchId)
  res.json({ success: true, data: reviews })
})

router.patch('/:reviewId', (req: Request, res: Response): void => {
  const { batchId, reviewId } = req.params
  const { decision, comment, operator } = req.body

  const review = db.prepare('SELECT * FROM review_records WHERE id = ? AND batch_id = ?').get(reviewId, batchId) as any
  if (!review) {
    res.status(404).json({
      code: 'REVIEW_NOT_FOUND',
      message: '复核记录不存在',
      actionableHint: '请检查复核记录ID是否正确',
    })
    return
  }

  const validDecisions = ['approved', 'rejected', 'needs_revision']
  if (decision && !validDecisions.includes(decision)) {
    res.status(400).json({
      code: 'INVALID_DECISION',
      message: '无效的复核决定',
      actionableHint: `decision 必须是以下值之一: ${validDecisions.join(', ')}`,
    })
    return
  }

  const newDecision = decision || review.decision
  const newComment = comment !== undefined ? comment : review.comment

  db.prepare(
    "UPDATE review_records SET decision = ?, comment = ?, reviewed_at = datetime('now') WHERE id = ?"
  ).run(newDecision, newComment, reviewId)

  logOperation(batchId, 'UPDATE_REVIEW', operator || 'system', `更新复核状态: ${review.decision} → ${newDecision}`)

  const updated = db.prepare('SELECT * FROM review_records WHERE id = ?').get(reviewId)
  res.json({ success: true, data: updated })
})

export default router
