import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'
import { recalculateAccruals } from '../services/vat-engine.js'
import { detectLateReturns } from '../services/exception-detector.js'

export default function (router: Router) {
  router.post('/import', (req: Request, res: Response): void => {
    const { returns } = req.body
    if (!Array.isArray(returns)) {
      res.status(400).json({ success: false, error: 'returns must be an array' })
      return
    }

    const now = new Date().toISOString()
    const insert = db.prepare(`
      INSERT INTO returns (id, return_id, original_order_id, country, period, gross_amount, vat_rate, vat_amount, is_late_arrival, original_period, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)

    let inserted = 0
    let skipped = 0
    const insertedIds: string[] = []

    const insertReturns = db.transaction(() => {
      for (const r of returns) {
        const existing = db.prepare(`SELECT id FROM returns WHERE return_id = ?`).get(r.returnId) as any
        if (existing) {
          skipped++
          continue
        }

        const vatAmount = r.grossAmount * r.vatRate / (100 + r.vatRate)
        let isLateArrival = 0
        let originalPeriod: string | null = null

        if (r.originalOrderId) {
          const order = db.prepare(`SELECT period FROM orders WHERE order_id = ?`).get(r.originalOrderId) as any
          if (order && order.period !== r.period) {
            isLateArrival = 1
            originalPeriod = order.period
          }
        }

        const id = uuidv4()
        insert.run(id, r.returnId, r.originalOrderId || null, r.country, r.period, r.grossAmount, r.vatRate, vatAmount, isLateArrival, originalPeriod, now)
        insertedIds.push(id)
        inserted++
      }
    })

    insertReturns()

    recalculateAccruals()
    detectLateReturns(insertedIds)

    res.json({ success: true, data: { inserted, skipped } })
  })

  router.get('/', (req: Request, res: Response): void => {
    const { country, period, status } = req.query
    let sql = 'SELECT * FROM returns WHERE 1=1'
    const params: any[] = []

    if (country) {
      sql += ' AND country = ?'
      params.push(country)
    }
    if (period) {
      sql += ' AND period = ?'
      params.push(period)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  })

  router.put('/:id/confirm', (req: Request, res: Response): void => {
    const { id } = req.params
    const { resolution } = req.body

    if (!resolution) {
      res.status(400).json({ success: false, error: 'resolution is required' })
      return
    }

    const ret = db.prepare(`SELECT * FROM returns WHERE id = ?`).get(id) as any
    if (!ret) {
      res.status(404).json({ success: false, error: 'Return not found' })
      return
    }

    const now = new Date().toISOString()

    const confirmReturn = db.transaction(() => {
      db.prepare(`UPDATE returns SET status = 'confirmed' WHERE id = ?`).run(id)
      recalculateAccruals()
    })

    confirmReturn()

    const updated = db.prepare(`SELECT * FROM returns WHERE id = ?`).get(id)
    res.json({ success: true, data: updated })
  })
}
