import { Router, type Request, type Response } from 'express'
import { listSettlements, getSettlementDetail, confirmSettlement, cancelSettlement, getSettlementTrail } from '../services/settlement.js'
import { addDeduction } from '../services/deduction.js'
import { createAmendment } from '../services/amendment.js'
import { getDb } from '../db.js'

const router = Router()

router.get('/export/csv', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const filters: string[] = []
    const params: unknown[] = []

    if (req.query.status) {
      filters.push('s.status = ?')
      params.push(req.query.status)
    }
    if (req.query.seller) {
      filters.push('c.seller_name LIKE ?')
      params.push(`%${req.query.seller}%`)
    }
    if (req.query.dateFrom) {
      filters.push('s.created_at >= ?')
      params.push(req.query.dateFrom)
    }
    if (req.query.dateTo) {
      filters.push('s.created_at <= ?')
      params.push(req.query.dateTo)
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
    const rows = db.prepare(`
      SELECT c.consignment_no, c.item_name, c.item_brand, c.seller_name,
             s.sale_price, s.commission_rate, s.commission_amount,
             s.total_deductions, s.net_amount, s.status, s.created_at
      FROM settlements s
      JOIN consignments c ON s.consignment_id = c.id
      ${whereClause}
      ORDER BY s.created_at DESC
    `).all(...params) as Record<string, unknown>[]

    const headers = ['寄售单号', '商品', '品牌', '卖家', '成交价', '佣金率', '佣金金额', '费用抵扣', '净结算额', '状态', '创建时间']
    const csvLines = [headers.join(',')]
    for (const row of rows) {
      csvLines.push([
        row.consignment_no,
        row.item_name,
        row.item_brand,
        row.seller_name,
        row.sale_price,
        row.commission_rate,
        row.commission_amount,
        row.total_deductions,
        row.net_amount,
        row.status,
        row.created_at,
      ].join(','))
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=settlements.csv')
    res.send('\uFEFF' + csvLines.join('\n'))
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      seller: req.query.seller as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    }
    const data = listSettlements(filters)
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const data = getSettlementDetail(req.params.id)
    if (!data) {
      res.status(404).json({ success: false, error: 'Settlement not found' })
      return
    }
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/confirm', (req: Request, res: Response): void => {
  try {
    const { operator } = req.body
    confirmSettlement(req.params.id, operator || 'system')
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/cancel', (req: Request, res: Response): void => {
  try {
    const { reason, operator } = req.body
    cancelSettlement(req.params.id, reason || '', operator || 'system')
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id/trail', (req: Request, res: Response): void => {
  try {
    const data = getSettlementTrail(req.params.id)
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/deductions', (req: Request, res: Response): void => {
  try {
    const { type, amount, description, sourceRef, operator } = req.body
    addDeduction(req.params.id, { type, amount, description, sourceRef }, operator || 'system')
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/amend', (req: Request, res: Response): void => {
  try {
    const { field, newValue, reason, operator } = req.body
    createAmendment(req.params.id, { field, newValue, reason }, operator || 'system')
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
