import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'
import { recalculateAccruals } from '../services/vat-engine.js'

export default function (router: Router) {
  router.post('/import', (req: Request, res: Response): void => {
    const { bills } = req.body
    if (!Array.isArray(bills)) {
      res.status(400).json({ success: false, error: 'bills must be an array' })
      return
    }

    const now = new Date().toISOString()
    const upsert = db.prepare(`
      INSERT INTO platform_bills (id, country, period, billed_vat, billed_gross, source, created_at)
      VALUES (?, ?, ?, ?, ?, 'import', ?)
      ON CONFLICT(country, period) DO UPDATE SET
        billed_vat = excluded.billed_vat,
        billed_gross = excluded.billed_gross,
        source = 'import',
        created_at = excluded.created_at
    `)

    let upserted = 0

    const importBills = db.transaction(() => {
      for (const b of bills) {
        const id = uuidv4()
        upsert.run(id, b.country, b.period, b.billedVat, b.billedGross, now)
        upserted++
      }
    })

    importBills()
    recalculateAccruals()

    res.json({ success: true, data: { upserted } })
  })

  router.get('/', (req: Request, res: Response): void => {
    const { country, period } = req.query
    let sql = 'SELECT * FROM platform_bills WHERE 1=1'
    const params: any[] = []

    if (country) {
      sql += ' AND country = ?'
      params.push(country)
    }
    if (period) {
      sql += ' AND period = ?'
      params.push(period)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  })
}
