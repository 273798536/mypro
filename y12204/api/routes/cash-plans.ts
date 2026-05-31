import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()
  const cashPlans = db.prepare(`SELECT * FROM cash_plans ORDER BY created_at DESC`).all()
  res.json(cashPlans)
})

router.get('/shortfalls', (_req: Request, res: Response): void => {
  const db = getDb()

  const shortfalls = db.prepare(`
    SELECT fl.*, b.bill_no, b.drawer, b.amount AS bill_amount, b.due_date,
      cp.plan_no, cp.period, cp.available_amount, cp.total_budget
    FROM fund_locks fl
    JOIN bill_registrations b ON b.id = fl.bill_id
    JOIN cash_plans cp ON cp.id = fl.cash_plan_id
    WHERE fl.status = 'shortfall'
    ORDER BY b.due_date ASC
  `).all()

  res.json(shortfalls)
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params

  const cashPlan = db.prepare(`SELECT * FROM cash_plans WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!cashPlan) {
    res.status(404).json({ error: 'Cash plan not found' })
    return
  }

  const fundLocks = db.prepare(
    `SELECT fl.*, b.bill_no, b.drawer, b.amount AS bill_amount, b.due_date, b.status AS bill_status
     FROM fund_locks fl
     JOIN bill_registrations b ON b.id = fl.bill_id
     WHERE fl.cash_plan_id = ?`
  ).all(id)

  const associatedBills = db.prepare(
    `SELECT b.* FROM bill_registrations b WHERE b.cash_plan_id = ?`
  ).all(id)

  res.json({ ...cashPlan, fund_locks: fundLocks, associated_bills: associatedBills })
})

export default router
