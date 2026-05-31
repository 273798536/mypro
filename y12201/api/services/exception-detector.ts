import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'

export function detectCrossPeriodRates(orderIds: string[]): string[] {
  const exceptionIds: string[] = []
  const now = new Date().toISOString()

  const getOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`)
  const getRate = db.prepare(`SELECT vat_rate FROM country_rates WHERE country = ? ORDER BY effective_from DESC LIMIT 1`)
  const checkExisting = db.prepare(`SELECT id FROM exceptions WHERE reference_type = 'order' AND reference_id = ? AND type = 'cross_period_rate' AND status = 'pending'`)

  for (const orderId of orderIds) {
    const order = getOrder.get(orderId) as any
    if (!order) continue

    const rateRow = getRate.get(order.country) as any
    if (!rateRow) continue

    if (Math.abs(order.vat_rate - rateRow.vat_rate) > 0.001) {
      const existing = checkExisting.get(orderId) as any
      if (existing) continue

      const impact = order.gross_amount * (rateRow.vat_rate - order.vat_rate) / 100
      const id = uuidv4()
      db.prepare(`
        INSERT INTO exceptions (id, type, reference_type, reference_id, country, period, description, impact, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, 'cross_period_rate', 'order', orderId, order.country, order.period,
        `订单 ${order.order_id} 税率 ${order.vat_rate}% 与国家 ${order.country} 当前税率 ${rateRow.vat_rate}% 不一致`,
        impact, 'pending', now)
      exceptionIds.push(id)
    }
  }

  return exceptionIds
}

export function detectLateReturns(returnIds: string[]): string[] {
  const exceptionIds: string[] = []
  const now = new Date().toISOString()

  const getReturn = db.prepare(`SELECT * FROM returns WHERE id = ?`)
  const checkExisting = db.prepare(`SELECT id FROM exceptions WHERE reference_type = 'return' AND reference_id = ? AND type = 'late_return' AND status = 'pending'`)

  for (const returnId of returnIds) {
    const ret = getReturn.get(returnId) as any
    if (!ret || !ret.is_late_arrival) continue

    const existing = checkExisting.get(returnId) as any
    if (existing) continue

    const id = uuidv4()
    db.prepare(`
      INSERT INTO exceptions (id, type, reference_type, reference_id, country, period, description, impact, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'late_return', 'return', returnId, ret.country, ret.period,
      `退货 ${ret.return_id} 跨期：原属期间 ${ret.original_period}，退货期间 ${ret.period}`,
      ret.vat_amount, 'pending', now)
    exceptionIds.push(id)
  }

  return exceptionIds
}

export function detectCountryMismatch(orderId: string, newCountry: string, oldVatRate: number, oldCountry: string): string | null {
  const now = new Date().toISOString()

  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any
  if (!order) return null

  const rateRow = db.prepare(`SELECT vat_rate FROM country_rates WHERE country = ? ORDER BY effective_from DESC LIMIT 1`).get(newCountry) as any
  if (!rateRow) return null

  if (Math.abs(oldVatRate - rateRow.vat_rate) > 0.001) {
    const id = uuidv4()
    const newVat = order.gross_amount * rateRow.vat_rate / (100 + rateRow.vat_rate)
    const oldVat = order.gross_amount * oldVatRate / (100 + oldVatRate)
    const impact = newVat - oldVat

    db.prepare(`
      INSERT INTO exceptions (id, type, reference_type, reference_id, country, period, description, impact, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'country_mismatch', 'order', orderId, newCountry, order.period,
      `订单 ${order.order_id} 重新分配至 ${newCountry}，税率从 ${oldVatRate}% 变为 ${rateRow.vat_rate}%`,
      impact, 'pending', now)
    return id
  }

  return null
}
