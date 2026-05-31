import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, anomalyType } = req.query

  let sql = `SELECT * FROM events WHERE 1=1`
  const params: unknown[] = []

  if (status) {
    sql += ` AND status = ?`
    params.push(status)
  }
  if (anomalyType) {
    sql += ` AND anomaly_type = ?`
    params.push(anomalyType)
  }

  sql += ` ORDER BY created_at DESC`

  const events = db.prepare(sql).all(...params)
  res.json(events)
})

router.get('/search', (req: Request, res: Response): void => {
  const db = getDb()
  const q = req.query.q as string

  if (!q) {
    res.status(400).json({ error: 'Missing search query parameter q' })
    return
  }

  const likeQ = `%${q}%`

  const byEventNo = db.prepare(
    `SELECT * FROM events WHERE event_no LIKE ?`
  ).all(likeQ) as Record<string, unknown>[]

  const linkedEventIds = db.prepare(
    `SELECT DISTINCT el.event_id FROM event_links el
     JOIN bill_registrations b ON el.target_type = 'bill' AND el.target_id = b.id
     WHERE b.bill_no LIKE ?
     UNION
     SELECT DISTINCT el.event_id FROM event_links el
     JOIN cash_plans cp ON el.target_type = 'cash_plan' AND el.target_id = cp.id
     WHERE cp.plan_no LIKE ?
     UNION
     SELECT DISTINCT el.event_id FROM event_links el
     JOIN payment_applications pa ON el.target_type = 'payment_application' AND el.target_id = pa.id
     WHERE pa.application_no LIKE ?`
  ).all(likeQ, likeQ, likeQ) as { event_id: string }[]

  const linkedEvents = linkedEventIds.length > 0
    ? db.prepare(
        `SELECT * FROM events WHERE id IN (${linkedEventIds.map(() => '?').join(',')})`
      ).all(...linkedEventIds.map(r => r.event_id)) as Record<string, unknown>[]
    : []

  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []

  for (const e of byEventNo) {
    if (!seen.has(e.id as string)) {
      seen.add(e.id as string)
      result.push(e)
    }
  }
  for (const e of linkedEvents) {
    if (!seen.has(e.id as string)) {
      seen.add(e.id as string)
      result.push(e)
    }
  }

  res.json(result)
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params

  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  const timeline = db.prepare(
    `SELECT * FROM event_timeline_items WHERE event_id = ? ORDER BY timestamp ASC`
  ).all(id)

  const diagnosis = db.prepare(
    `SELECT * FROM anomaly_diagnoses WHERE event_id = ?`
  ).get(id) as Record<string, unknown> | undefined

  const linkedBills = db.prepare(
    `SELECT b.* FROM bill_registrations b
     JOIN event_links el ON el.target_id = b.id AND el.target_type = 'bill'
     WHERE el.event_id = ?`
  ).all(id)

  const linkedCashPlans = db.prepare(
    `SELECT cp.* FROM cash_plans cp
     JOIN event_links el ON el.target_id = cp.id AND el.target_type = 'cash_plan'
     WHERE el.event_id = ?`
  ).all(id)

  const linkedPaymentApplications = db.prepare(
    `SELECT pa.* FROM payment_applications pa
     JOIN event_links el ON el.target_id = pa.id AND el.target_type = 'payment_application'
     WHERE el.event_id = ?`
  ).all(id)

  res.json({
    ...event,
    timeline,
    anomaly_diagnosis: diagnosis ?? null,
    linked_bills: linkedBills,
    linked_cash_plans: linkedCashPlans,
    linked_payment_applications: linkedPaymentApplications,
  })
})

router.post('/:id/diagnosis', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { next_action, next_material_needed, current_blocker, resolved_at } = req.body

  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  const existing = db.prepare(`SELECT * FROM anomaly_diagnoses WHERE event_id = ?`).get(id) as Record<string, unknown> | undefined

  if (existing) {
    const updates: string[] = []
    const params: unknown[] = []

    if (next_action !== undefined) {
      updates.push(`next_action = ?`)
      params.push(next_action)
    }
    if (next_material_needed !== undefined) {
      updates.push(`next_material_needed = ?`)
      params.push(next_material_needed)
    }
    if (current_blocker !== undefined) {
      updates.push(`current_blocker = ?`)
      params.push(current_blocker)
    }
    if (resolved_at !== undefined) {
      updates.push(`resolved_at = ?`)
      params.push(resolved_at)
    }

    if (updates.length > 0) {
      params.push(id)
      db.prepare(`UPDATE anomaly_diagnoses SET ${updates.join(', ')} WHERE event_id = ?`).run(...params)
    }
  } else {
    db.prepare(
      `INSERT INTO anomaly_diagnoses (id, event_id, anomaly_type, trigger_material, trigger_reference, current_blocker, next_action, next_material_needed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      id,
      event.anomaly_type ?? 'unknown',
      '',
      '',
      current_blocker ?? '',
      next_action ?? '',
      next_material_needed ?? ''
    )
  }

  if (resolved_at) {
    db.prepare(`UPDATE events SET status = 'resolved', updated_at = datetime('now','localtime') WHERE id = ?`).run(id)

    db.prepare(
      `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'diagnosis_resolved', ?, ?, ?, ?)`
    ).run(uuidv4(), id, id, event.event_no as string, `异常诊断已标记解决`, '系统')
  }

  const updatedDiagnosis = db.prepare(`SELECT * FROM anomaly_diagnoses WHERE event_id = ?`).get(id)
  const updatedEvent = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id)

  res.json({ event: updatedEvent, diagnosis: updatedDiagnosis })
})

export default router
