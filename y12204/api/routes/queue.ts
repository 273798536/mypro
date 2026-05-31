import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()

  const rows = db.prepare(`
    SELECT b.*, fl.id AS fl_id, fl.cash_plan_id AS fl_cash_plan_id, fl.locked_amount AS fl_locked_amount,
      fl.status AS fl_status, fl.locked_at AS fl_locked_at, fl.released_at AS fl_released_at,
      e.id AS evt_id, e.event_no AS evt_event_no, e.title AS evt_title, e.anomaly_type AS evt_anomaly_type, e.status AS evt_status
    FROM bill_registrations b
    LEFT JOIN fund_locks fl ON fl.bill_id = b.id
    LEFT JOIN events e ON e.id = b.event_id
    ORDER BY b.priority_score DESC, b.due_date ASC
  `).all() as Record<string, unknown>[]

  const queue = rows.map((row) => {
    const bill: Record<string, unknown> = {}
    const fundLock: Record<string, unknown> = {}
    const evt: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('fl_')) {
        fundLock[key.slice(3)] = value
      } else if (key.startsWith('evt_')) {
        evt[key.slice(4)] = value
      } else {
        bill[key] = value
      }
    }

    return {
      ...bill,
      fund_lock_status: fundLock.id ? fundLock.status : null,
      has_dispute: bill.has_dispute,
      has_duplicate: bill.has_duplicate,
      event: evt.id ? evt : null,
    }
  })

  res.json(queue)
})

router.post('/dispute/:billId', (req: Request, res: Response): void => {
  const db = getDb()
  const { billId } = req.params
  const { reason, reporter } = req.body

  if (!reason || !reporter) {
    res.status(400).json({ error: 'Missing required fields: reason and reporter' })
    return
  }

  const bill = db.prepare(`SELECT * FROM bill_registrations WHERE id = ?`).get(billId) as Record<string, unknown> | undefined
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  const disputeId = uuidv4()
  db.prepare(
    `INSERT INTO disputes (id, bill_id, reason, reporter, status) VALUES (?, ?, ?, ?, 'open')`
  ).run(disputeId, billId, reason, reporter)

  db.prepare(
    `UPDATE bill_registrations SET has_dispute = 1, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(billId)

  db.prepare(
    `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'dispute_raised', ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    bill.event_id as string,
    disputeId,
    bill.bill_no as string,
    `争议标记：${reason}`,
    reporter
  )

  const dispute = db.prepare(`SELECT * FROM disputes WHERE id = ?`).get(disputeId)
  res.status(201).json(dispute)
})

export default router
