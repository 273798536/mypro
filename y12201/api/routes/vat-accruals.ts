import { Router, type Request, type Response } from 'express'
import db from '../database.js'

export default function (router: Router) {
  router.get('/', (req: Request, res: Response): void => {
    const { country, period } = req.query
    let sql = 'SELECT * FROM vat_accruals WHERE 1=1'
    const params: any[] = []

    if (country) {
      sql += ' AND country = ?'
      params.push(country)
    }
    if (period) {
      sql += ' AND period = ?'
      params.push(period)
    }

    sql += ' ORDER BY period DESC, country'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows })
  })

  router.get('/summary', (req: Request, res: Response): void => {
    const totalAccruals = db.prepare(`SELECT COUNT(*) as count FROM vat_accruals`).get() as any
    const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders`).get() as any
    const totalReturns = db.prepare(`SELECT COUNT(*) as count FROM returns`).get() as any
    const totalBills = db.prepare(`SELECT COUNT(*) as count FROM platform_bills`).get() as any
    const pendingExceptions = db.prepare(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'pending'`).get() as any

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(net_vat) as total_net_vat, SUM(difference) as total_difference
      FROM vat_accruals
      GROUP BY status
    `).all()

    const countrySummary = db.prepare(`
      SELECT country, SUM(order_vat) as total_order_vat, SUM(return_vat) as total_return_vat,
             SUM(net_vat) as total_net_vat, SUM(billed_vat) as total_billed_vat, SUM(difference) as total_difference
      FROM vat_accruals
      GROUP BY country
      ORDER BY total_net_vat DESC
    `).all()

    const recentPeriods = db.prepare(`
      SELECT DISTINCT period FROM vat_accruals ORDER BY period DESC LIMIT 12
    `).all()

    res.json({
      success: true,
      data: {
        overview: {
          totalAccruals: totalAccruals.count,
          totalOrders: totalOrders.count,
          totalReturns: totalReturns.count,
          totalBills: totalBills.count,
          pendingExceptions: pendingExceptions.count
        },
        statusBreakdown,
        countrySummary,
        recentPeriods
      }
    })
  })
}
