import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, drawer, dueDateStart, dueDateEnd, fundLockStatus } = req.query

  let sql = `
    SELECT b.*, fl.id AS fl_id, fl.cash_plan_id AS fl_cash_plan_id, fl.locked_amount AS fl_locked_amount,
      fl.status AS fl_status, fl.locked_at AS fl_locked_at, fl.released_at AS fl_released_at
    FROM bill_registrations b
    LEFT JOIN fund_locks fl ON fl.bill_id = b.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (status) {
    sql += ` AND b.status = ?`
    params.push(status)
  }
  if (drawer) {
    sql += ` AND b.drawer LIKE ?`
    params.push(`%${drawer}%`)
  }
  if (dueDateStart) {
    sql += ` AND b.due_date >= ?`
    params.push(dueDateStart)
  }
  if (dueDateEnd) {
    sql += ` AND b.due_date <= ?`
    params.push(dueDateEnd)
  }
  if (fundLockStatus) {
    sql += ` AND fl.status = ?`
    params.push(fundLockStatus)
  }

  sql += ` ORDER BY b.due_date ASC, b.priority_score DESC`

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

  const bills = rows.map((row) => {
    const bill: Record<string, unknown> = {}
    const fundLock: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('fl_')) {
        fundLock[key.slice(3)] = value
      } else {
        bill[key] = value
      }
    }

    if (fundLock.id) {
      bill.fund_lock = fundLock
    } else {
      bill.fund_lock = null
    }

    return bill
  })

  res.json(bills)
})

router.get('/duplicates', (_req: Request, res: Response): void => {
  const db = getDb()

  const groups = db.prepare(`
    SELECT drawer, amount, due_date, COUNT(*) AS cnt, MIN(event_id) AS event_id
    FROM bill_registrations
    GROUP BY drawer, amount, due_date
    HAVING cnt > 1
  `).all() as { drawer: string; amount: number; due_date: string; cnt: number; event_id: string }[]

  const result = groups.map((group) => {
    const bills = db.prepare(
      `SELECT * FROM bill_registrations WHERE drawer = ? AND amount = ? AND due_date = ? ORDER BY created_at ASC`
    ).all(group.drawer, group.amount, group.due_date)
    return { ...group, bills }
  })

  res.json(result)
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params

  const bill = db.prepare(`SELECT * FROM bill_registrations WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  const fundLock = db.prepare(`SELECT * FROM fund_locks WHERE bill_id = ?`).get(id) as Record<string, unknown> | undefined

  let cashPlan = null
  if (bill.cash_plan_id) {
    cashPlan = db.prepare(`SELECT * FROM cash_plans WHERE id = ?`).get(bill.cash_plan_id as string)
  }

  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(bill.event_id as string) as Record<string, unknown> | undefined

  let timeline: unknown[] = []
  if (event) {
    timeline = db.prepare(`SELECT * FROM event_timeline_items WHERE event_id = ? ORDER BY timestamp ASC`).all(event.id)
  }

  res.json({ ...bill, fund_lock: fundLock ?? null, cash_plan: cashPlan, event: event ?? null, timeline })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { billNo, drawer, payee, amount, dueDate, issueDate, acceptor, createdBy } = req.body

  if (!billNo || !drawer || !payee || !amount || !dueDate || !issueDate || !acceptor || !createdBy) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const duplicateCheck = db.prepare(
    `SELECT id FROM bill_registrations WHERE drawer = ? AND amount = ? AND due_date = ?`
  ).get(drawer, amount, dueDate) as { id: string } | undefined

  const hasDuplicate = duplicateCheck ? 1 : 0

  const eventId = uuidv4()
  const now = new Date()
  const year = now.getFullYear().toString()
  const maxEventNo = db.prepare(
    `SELECT event_no FROM events WHERE event_no LIKE ? ORDER BY event_no DESC LIMIT 1`
  ).get(`EVT-${year}-%`) as { event_no: string } | undefined

  let seq = 1
  if (maxEventNo) {
    const parts = maxEventNo.event_no.split('-')
    seq = parseInt(parts[2], 10) + 1
  }
  const eventNo = `EVT-${year}-${String(seq).padStart(4, '0')}`

  const anomalyType = hasDuplicate ? 'duplicate' : null

  db.prepare(
    `INSERT INTO events (id, event_no, title, anomaly_type, status) VALUES (?, ?, ?, ?, 'open')`
  ).run(eventId, eventNo, `${drawer}商票兑付`, anomalyType)

  if (hasDuplicate) {
    const diagId = uuidv4()
    db.prepare(
      `INSERT INTO anomaly_diagnoses (id, event_id, anomaly_type, trigger_material, trigger_reference, current_blocker, next_action, next_material_needed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      diagId,
      eventId,
      'duplicate',
      `商票登记 ${billNo}`,
      billNo,
      '相同出票人/金额/到期日的票据已存在，无法确认是否为重复录入',
      '联系出票方确认真实票据数量',
      '出票方盖章确认函'
    )
  }

  const billId = uuidv4()
  db.prepare(
    `INSERT INTO bill_registrations (id, bill_no, drawer, payee, amount, due_date, issue_date, acceptor, status, priority_score, event_id, has_duplicate, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 0, ?, ?, ?)`
  ).run(billId, billNo, drawer, payee, amount, dueDate, issueDate, acceptor, eventId, hasDuplicate, createdBy)

  if (duplicateCheck) {
    db.prepare(
      `UPDATE bill_registrations SET has_duplicate = 1 WHERE id = ?`
    ).run(duplicateCheck.id)
  }

  const timelineId = uuidv4()
  db.prepare(
    `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'bill_registration', ?, ?, ?, ?)`
  ).run(timelineId, eventId, billId, billNo, `新增商票登记 ${billNo}，金额${(amount / 10000).toFixed(2)}万元`, createdBy)

  db.prepare(
    `INSERT INTO event_links (id, event_id, target_type, target_id) VALUES (?, ?, 'bill', ?)`
  ).run(uuidv4(), eventId, billId)

  const bill = db.prepare(`SELECT * FROM bill_registrations WHERE id = ?`).get(billId)
  res.status(201).json(bill)
})

router.put('/:id/status', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { status, operator } = req.body

  if (!status || !operator) {
    res.status(400).json({ error: 'Missing required fields: status and operator' })
    return
  }

  const bill = db.prepare(`SELECT * FROM bill_registrations WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  const currentStatus = bill.status as string
  const validTransitions: Record<string, string[]> = {
    pending_review: ['reviewed', 'rejected'],
    reviewed: ['pending_payment'],
    pending_payment: ['paid'],
  }

  const allowed = validTransitions[currentStatus]
  if (!allowed || !allowed.includes(status)) {
    res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${status}` })
    return
  }

  const statusLabels: Record<string, string> = {
    pending_review: '待复核',
    reviewed: '已复核',
    pending_payment: '待兑付',
    paid: '已兑付',
    rejected: '已驳回',
  }

  db.prepare(
    `UPDATE bill_registrations SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(status, id)

  db.prepare(
    `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'status_change', ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    bill.event_id as string,
    id,
    bill.bill_no as string,
    `商票状态从"${statusLabels[currentStatus]}"推进为"${statusLabels[status]}"`,
    operator
  )

  if (status === 'reviewed') {
    const cashPlan = db.prepare(
      `SELECT * FROM cash_plans WHERE status = 'active' AND available_amount >= ? ORDER BY available_amount DESC LIMIT 1`
    ).get(bill.amount as number) as Record<string, unknown> | undefined

    const cashPlanId = cashPlan ? (cashPlan.id as string) : null

    db.prepare(
      `UPDATE bill_registrations SET cash_plan_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`
    ).run(cashPlanId, id)

    if (cashPlanId) {
      const flId = uuidv4()
      db.prepare(
        `INSERT INTO fund_locks (id, cash_plan_id, bill_id, locked_amount, status) VALUES (?, ?, ?, ?, 'pending')`
      ).run(flId, cashPlanId, id, bill.amount as number)

      db.prepare(
        `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'fund_lock', ?, ?, ?, ?)`
      ).run(
        uuidv4(),
        bill.event_id as string,
        flId,
        `FL-${flId.slice(0, 6)}`,
        `资金锁定${(bill.amount as number) / 10000}万元，关联现金计划 ${cashPlan!.plan_no as string}`,
        operator
      )
    }
  }

  if (status === 'paid') {
    const fundLock = db.prepare(`SELECT * FROM fund_locks WHERE bill_id = ?`).get(id) as Record<string, unknown> | undefined
    if (fundLock) {
      db.prepare(
        `UPDATE fund_locks SET status = 'released', released_at = datetime('now','localtime') WHERE bill_id = ?`
      ).run(id)

      db.prepare(
        `INSERT INTO event_timeline_items (id, event_id, type, reference_id, reference_no, description, operator) VALUES (?, ?, 'fund_release', ?, ?, ?, ?)`
      ).run(
        uuidv4(),
        bill.event_id as string,
        fundLock.id as string,
        `FL-${(fundLock.id as string).slice(0, 6)}`,
        `释放资金锁定${(bill.amount as number) / 10000}万元`,
        operator
      )
    }
  }

  const updatedBill = db.prepare(`SELECT * FROM bill_registrations WHERE id = ?`).get(id)
  res.json(updatedBill)
})

export default router
