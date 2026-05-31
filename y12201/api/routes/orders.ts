import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'
import { recalculateAccruals } from '../services/vat-engine.js'
import { detectCrossPeriodRates, detectCountryMismatch } from '../services/exception-detector.js'
import { logAudit } from '../services/audit-service.js'

export default function (router: Router) {
  router.post('/import', (req: Request, res: Response): void => {
    const { orders } = req.body
    if (!Array.isArray(orders)) {
      res.status(400).json({ success: false, error: 'orders must be an array' })
      return
    }

    const now = new Date().toISOString()
    const insert = db.prepare(`
      INSERT INTO orders (id, order_id, country, period, gross_amount, vat_rate, vat_amount, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'import', 'normal', ?, ?)
    `)

    let inserted = 0
    let skipped = 0
    const insertedIds: string[] = []

    const insertOrder = db.transaction(() => {
      for (const o of orders) {
        const existing = db.prepare(`SELECT id FROM orders WHERE order_id = ?`).get(o.orderId) as any
        if (existing) {
          skipped++
          continue
        }

        const vatAmount = o.grossAmount * o.vatRate / (100 + o.vatRate)
        const id = uuidv4()
        insert.run(id, o.orderId, o.country, o.period, o.grossAmount, o.vatRate, vatAmount, now, now)
        insertedIds.push(id)
        inserted++
      }
    })

    insertOrder()

    recalculateAccruals()
    detectCrossPeriodRates(insertedIds)

    res.json({ success: true, data: { inserted, skipped } })
  })

  router.get('/', (req: Request, res: Response): void => {
    const { country, period, status } = req.query
    let sql = 'SELECT * FROM orders WHERE 1=1'
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

  router.put('/:id/country', (req: Request, res: Response): void => {
    const { id } = req.params
    const { newCountry, reason } = req.body

    if (!newCountry || !reason) {
      res.status(400).json({ success: false, error: 'newCountry and reason are required' })
      return
    }

    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' })
      return
    }

    const oldCountry = order.country
    if (oldCountry === newCountry) {
      res.status(400).json({ success: false, error: 'New country is the same as current' })
      return
    }

    const newRateRow = db.prepare(`SELECT vat_rate FROM country_rates WHERE country = ? ORDER BY effective_from DESC LIMIT 1`).get(newCountry) as any
    if (!newRateRow) {
      res.status(400).json({ success: false, error: 'Invalid country code' })
      return
    }

    const oldVatAmount = order.vat_amount
    const newVatRate = newRateRow.vat_rate
    const newVatAmount = order.gross_amount * newVatRate / (100 + newVatRate)
    const impactAmount = newVatAmount - oldVatAmount
    const now = new Date().toISOString()

    const updateOrder = db.transaction(() => {
      logAudit({
        entityType: 'order',
        entityId: id,
        field: 'country',
        oldValue: oldCountry,
        newValue: newCountry,
        reason,
        impactAmount
      })

      db.prepare(`
        UPDATE orders SET country = ?, vat_rate = ?, vat_amount = ?, status = 'adjusted', updated_at = ?
        WHERE id = ?
      `).run(newCountry, newVatRate, newVatAmount, now, id)

      recalculateAccruals()
      detectCountryMismatch(id, newCountry, order.vat_rate, oldCountry)
    })

    updateOrder()

    const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id)
    res.json({ success: true, data: updated })
  })
}
