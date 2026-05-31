import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'
import { recalculateAccruals } from '../services/vat-engine.js'
import { detectCrossPeriodRates, detectLateReturns } from '../services/exception-detector.js'

export default function setupSeed(router: Router) {
  router.post('/', (req: Request, res: Response): void => {
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevMonth = now.getMonth() === 0 ? new Date(now.getFullYear() - 1, 11) : new Date(now.getFullYear(), now.getMonth() - 1)
    const previousPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
    const nowISO = now.toISOString()

    const ordersData = [
      { country: 'DE', vatRate: 19.0, grossAmounts: [5000, 3200, 7800, 2100, 4500] },
      { country: 'FR', vatRate: 20.0, grossAmounts: [6100, 4800, 9200, 3500] },
      { country: 'IT', vatRate: 22.0, grossAmounts: [5500, 3800, 6700, 2900] },
      { country: 'ES', vatRate: 21.0, grossAmounts: [4200, 7300, 3100, 5800] },
      { country: 'NL', vatRate: 21.0, grossAmounts: [6500, 4300, 8100] },
    ]

    const wrongRateOrder = { country: 'DE', vatRate: 18.0, grossAmount: 6000 }

    const insertOrder = db.prepare(`
      INSERT INTO orders (id, order_id, country, period, gross_amount, vat_rate, vat_amount, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'seed', 'normal', ?, ?)
    `)

    const insertReturn = db.prepare(`
      INSERT INTO returns (id, return_id, original_order_id, country, period, gross_amount, vat_rate, vat_amount, is_late_arrival, original_period, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)

    const upsertBill = db.prepare(`
      INSERT INTO platform_bills (id, country, period, billed_vat, billed_gross, source, created_at)
      VALUES (?, ?, ?, ?, ?, 'seed', ?)
      ON CONFLICT(country, period) DO UPDATE SET
        billed_vat = excluded.billed_vat,
        billed_gross = excluded.billed_gross,
        source = 'seed',
        created_at = excluded.created_at
    `)

    let orderCount = 0
    let returnCount = 0
    let billCount = 0
    const insertedOrderIds: string[] = []
    const insertedReturnIds: string[] = []
    const firstOrderByCountry: Record<string, string> = {}
    const orderVatSums: Record<string, number> = {}

    const seedAll = db.transaction(() => {
      for (const group of ordersData) {
        let countryVatSum = 0
        for (let i = 0; i < group.grossAmounts.length; i++) {
          const gross = group.grossAmounts[i]
          const vatAmount = gross * group.vatRate / (100 + group.vatRate)
          const id = uuidv4()
          const orderId = `ORD-${group.country}-${String(i + 1).padStart(3, '0')}`
          insertOrder.run(id, orderId, group.country, currentPeriod, gross, group.vatRate, vatAmount, nowISO, nowISO)
          insertedOrderIds.push(id)
          orderCount++
          countryVatSum += vatAmount
          if (i === 0) {
            firstOrderByCountry[group.country] = orderId
          }
        }
        orderVatSums[group.country] = countryVatSum
      }

      const wrongVatAmount = wrongRateOrder.grossAmount * wrongRateOrder.vatRate / (100 + wrongRateOrder.vatRate)
      const wrongOrderId = uuidv4()
      const wrongOrderOrderid = 'ORD-DE-006'
      insertOrder.run(wrongOrderId, wrongOrderOrderid, wrongRateOrder.country, currentPeriod, wrongRateOrder.grossAmount, wrongRateOrder.vatRate, wrongVatAmount, nowISO, nowISO)
      insertedOrderIds.push(wrongOrderId)
      orderCount++
      orderVatSums['DE'] += wrongVatAmount

      const returnsData = [
        { country: 'DE', grossAmount: 1500, vatRate: 19.0, period: currentPeriod, useOriginal: true },
        { country: 'FR', grossAmount: 2200, vatRate: 20.0, period: previousPeriod, useOriginal: true },
        { country: 'IT', grossAmount: 800, vatRate: 22.0, period: currentPeriod, useOriginal: false },
      ]

      for (let i = 0; i < returnsData.length; i++) {
        const r = returnsData[i]
        const vatAmount = r.grossAmount * r.vatRate / (100 + r.vatRate)
        const id = uuidv4()
        const returnId = `RET-${r.country}-${String(i + 1).padStart(3, '0')}`
        const originalOrderId = r.useOriginal ? (firstOrderByCountry[r.country] || null) : null
        let isLateArrival = 0
        let originalPeriod: string | null = null

        if (originalOrderId) {
          const order = db.prepare(`SELECT period FROM orders WHERE order_id = ?`).get(originalOrderId) as any
          if (order && order.period !== r.period) {
            isLateArrival = 1
            originalPeriod = order.period
          }
        }

        insertReturn.run(id, returnId, originalOrderId, r.country, r.period, r.grossAmount, r.vatRate, vatAmount, isLateArrival, originalPeriod, nowISO)
        insertedReturnIds.push(id)
        returnCount++
      }

      const billsData = [
        { country: 'DE', billedVat: orderVatSums['DE'] - 45.23 },
        { country: 'FR', billedVat: orderVatSums['FR'] + 12.50 },
        { country: 'IT', billedVat: orderVatSums['IT'] },
        { country: 'ES', billedVat: orderVatSums['ES'] - 230.00 },
      ]

      for (const b of billsData) {
        const id = uuidv4()
        upsertBill.run(id, b.country, currentPeriod, b.billedVat, b.billedVat * 6, nowISO)
        billCount++
      }
    })

    seedAll()

    recalculateAccruals()
    detectCrossPeriodRates(insertedOrderIds)
    detectLateReturns(insertedReturnIds)

    res.json({
      success: true,
      data: {
        orders: orderCount,
        returns: returnCount,
        bills: billCount,
        period: currentPeriod,
      },
    })
  })
}
