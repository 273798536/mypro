import { Router, type Request, type Response } from 'express'
import * as XLSX from 'xlsx'
import db from '../db.js'

const router = Router()

router.get('/validate/:id', (req: Request, res: Response): void => {
  const { id } = req.params

  const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(id) as any
  if (!caseRow) {
    res.status(404).json({ success: false, error: '案件不存在' })
    return
  }

  const missing: string[] = []

  const treatments = db.prepare(`SELECT 1 FROM treatment_records WHERE refund_case_id = ? LIMIT 1`).all(id)
  if (treatments.length === 0) {
    missing.push('疗程记录')
  }

  if (!caseRow.treatment_consumed || caseRow.treatment_consumed <= 0) {
    missing.push('疗程消耗金额')
  }

  res.json({
    success: true,
    data: {
      pass: missing.length === 0,
      missing,
    },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { caseIds, format } = req.body

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    res.status(400).json({ success: false, error: '请选择要导出的案件' })
    return
  }

  const rows: Record<string, any>[] = []

  for (const caseId of caseIds) {
    const caseRow = db.prepare(`SELECT * FROM refund_cases WHERE id = ?`).get(caseId) as any
    if (!caseRow) continue

    const contracts = db.prepare(`SELECT * FROM installment_contracts WHERE refund_case_id = ? ORDER BY import_order`).all(caseId) as any[]
    const feeItems = db.prepare(`SELECT * FROM pending_items WHERE refund_case_id = ? AND type = '平台手续费'`).all(caseId) as any[]
    const couponItems = db.prepare(`SELECT * FROM pending_items WHERE refund_case_id = ? AND type = '优惠券追回'`).all(caseId) as any[]

    const platformNames = contracts.map(c => c.platform_name).join('、') || '-'
    const contractAmount = contracts.reduce((s: number, c: any) => s + c.contract_amount, 0)
    const feeStatus = feeItems.length > 0 ? feeItems.map(f => f.status).join('、') : '-'
    const couponStatus = couponItems.length > 0 ? couponItems.map(c => c.status).join('、') : '-'
    const platformSettled = contracts.length > 0 ? contracts.every(c => c.platform_status === '已结清') ? '已结清' : '未结清' : '-'

    rows.push({
      '客户姓名': caseRow.customer_name,
      '分期平台': platformNames,
      '合同金额': contractAmount,
      '疗程消耗': caseRow.treatment_consumed,
      '平台应退': caseRow.platform_refund,
      '门店应退': caseRow.store_refund,
      '平台手续费状态': feeStatus,
      '优惠券追回状态': couponStatus,
      '平台结清状态': platformSettled,
    })
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, '退款拆账')

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=refund_export_${Date.now()}.csv`)
    res.send('\uFEFF' + csvContent)
  } else {
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=refund_export_${Date.now()}.xlsx`)
    res.send(buf)
  }
})

export default router
