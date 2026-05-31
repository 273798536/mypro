import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'

export function recalculateAccruals(): void {
  const now = new Date().toISOString()

  const orderSums = db.prepare(`
    SELECT country, period, SUM(vat_amount) as order_vat
    FROM orders
    WHERE status IN ('normal', 'adjusted')
    GROUP BY country, period
  `).all() as Array<{ country: string; period: string; order_vat: number }>

  const returnSums = db.prepare(`
    SELECT country, period, SUM(vat_amount) as return_vat
    FROM returns
    WHERE status != 'rejected'
    GROUP BY country, period
  `).all() as Array<{ country: string; period: string; return_vat: number }>

  const billMap = new Map<string, number>()
  const bills = db.prepare(`SELECT country, period, billed_vat FROM platform_bills`).all() as Array<{ country: string; period: string; billed_vat: number }>
  for (const b of bills) {
    billMap.set(`${b.country}|${b.period}`, b.billed_vat)
  }

  const returnMap = new Map<string, number>()
  for (const r of returnSums) {
    returnMap.set(`${r.country}|${r.period}`, r.return_vat)
  }

  const allKeys = new Set<string>()
  for (const o of orderSums) allKeys.add(`${o.country}|${o.period}`)
  for (const r of returnSums) allKeys.add(`${r.country}|${r.period}`)

  const upsert = db.prepare(`
    INSERT INTO vat_accruals (id, country, period, order_vat, return_vat, net_vat, billed_vat, difference, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(country, period) DO UPDATE SET
      order_vat = excluded.order_vat,
      return_vat = excluded.return_vat,
      net_vat = excluded.net_vat,
      billed_vat = excluded.billed_vat,
      difference = excluded.difference,
      status = excluded.status,
      updated_at = excluded.updated_at
  `)

  const orderMap = new Map<string, number>()
  for (const o of orderSums) {
    orderMap.set(`${o.country}|${o.period}`, o.order_vat)
  }

  for (const key of allKeys) {
    const [country, period] = key.split('|')
    const orderVat = orderMap.get(key) || 0
    const returnVat = returnMap.get(key) || 0
    const netVat = orderVat - returnVat
    const billedVat = billMap.get(key) || 0
    const difference = netVat - billedVat

    let status: string
    if (!billMap.has(key)) {
      status = 'pending_bill'
    } else if (Math.abs(difference) < 0.01) {
      status = 'matched'
    } else {
      status = 'variance'
    }

    upsert.run(uuidv4(), country, period, orderVat, returnVat, netVat, billedVat, difference, status, now)
  }
}
