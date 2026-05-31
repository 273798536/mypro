import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'

const refundRouter = Router()

refundRouter.post('/calculate', (req: Request, res: Response): void => {
  const { packageId } = req.body

  if (!packageId) {
    res.status(400).json({ success: false, error: '套餐ID必填' })
    return
  }

  const pkg = db.prepare(`SELECT * FROM packages WHERE id = ?`).get(packageId) as any
  if (!pkg) {
    res.status(404).json({ success: false, error: '套餐不存在' })
    return
  }

  const unitPrice = pkg.total_deductions > 0 ? pkg.price / pkg.total_deductions : 0
  const usedValue = pkg.used_deductions * unitPrice
  const remainingValue = pkg.remaining_deductions * unitPrice

  const manualOverrides = db.prepare(
    `SELECT * FROM deduction_details WHERE package_id = ? AND status = 'manual_override'`
  ).all(packageId) as any[]

  let manualOverrideImpact = 0
  for (const mo of manualOverrides) {
    if (mo.original_status === 'duplicate' || mo.original_status === 'expired') {
      manualOverrideImpact += unitPrice
    }
  }

  const totalRefundable = remainingValue + manualOverrideImpact
  const deductions = db.prepare(
    `SELECT dd.*, t.amount as transaction_amount, t.created_at as transaction_date FROM deduction_details dd LEFT JOIN transactions t ON dd.transaction_id = t.id WHERE dd.package_id = ? ORDER BY dd.created_at`
  ).all(packageId)

  res.json({
    success: true,
    data: {
      packageId: pkg.id,
      packageName: pkg.name,
      price: pkg.price,
      totalDeductions: pkg.total_deductions,
      usedDeductions: pkg.used_deductions,
      remainingDeductions: pkg.remaining_deductions,
      unitPrice: Math.round(unitPrice * 100) / 100,
      usedValue: Math.round(usedValue * 100) / 100,
      remainingValue: Math.round(remainingValue * 100) / 100,
      manualOverrideCount: manualOverrides.length,
      manualOverrideImpact: Math.round(manualOverrideImpact * 100) / 100,
      totalRefundable: Math.round(totalRefundable * 100) / 100,
      status: pkg.status,
      expiresAt: pkg.expires_at,
      deductions,
    },
  })
})

const exportRouter = Router()

exportRouter.post('/', (req: Request, res: Response): void => {
  const { format = 'csv', type = 'normal_details', startDate, endDate, memberStatus } = req.query as Record<string, string>
  const bodyFilters = req.body || {}
  const filterStartDate = bodyFilters.startDate || startDate
  const filterEndDate = bodyFilters.endDate || endDate
  const filterMemberStatus = bodyFilters.memberStatus || memberStatus
  const filterType = bodyFilters.type || type
  const filterFormat = bodyFilters.format || format

  let memberIds: string[] = []
  if (filterMemberStatus) {
    memberIds = db.prepare(`SELECT id FROM member_accounts WHERE status = ?`).all(filterMemberStatus).map((m: any) => m.id)
  } else {
    memberIds = db.prepare(`SELECT id FROM member_accounts`).all().map((m: any) => m.id)
  }
  const memberIdList = memberIds.length > 0 ? memberIds.map(() => '?').join(',') : "'__none__'"

  let dateFilter = ''
  const dateParams: any[] = []
  if (filterStartDate) { dateFilter += ' AND created_at >= ?'; dateParams.push(filterStartDate) }
  if (filterEndDate) { dateFilter += ' AND created_at <= ?'; dateParams.push(filterEndDate) }

  let rows: any[] = []
  let headers: string[] = []

  if (filterType === 'normal_details') {
    headers = ['交易ID', '会员', '宠物', '套餐', '金额', '类型', '是否补录', '创建时间']
    rows = db.prepare(
      `SELECT t.id, m.name as member_name, p.name as pet_name, pk.name as package_name, t.amount, t.type, t.is_backfilled, t.created_at FROM transactions t LEFT JOIN member_accounts m ON t.member_id = m.id LEFT JOIN pet_profiles p ON t.pet_id = p.id LEFT JOIN packages pk ON t.package_id = pk.id WHERE t.member_id IN (${memberIdList})${dateFilter} ORDER BY t.created_at DESC`
    ).all(...memberIds, ...dateParams)
  } else if (filterType === 'exception_details') {
    headers = ['异常ID', '类型', '严重程度', '会员', '宠物', '描述', '状态', '创建时间']
    rows = db.prepare(
      `SELECT e.id, e.type, e.severity, m.name as member_name, p.name as pet_name, e.description, e.status, e.created_at FROM exception_items e LEFT JOIN member_accounts m ON e.related_member_id = m.id LEFT JOIN pet_profiles p ON e.related_pet_id = p.id WHERE 1=1 ORDER BY e.created_at DESC`
    ).all()
  } else if (filterType === 'refund_report') {
    headers = ['套餐ID', '套餐名称', '会员', '价格', '总次数', '已用次数', '剩余次数', '剩余价值', '手动覆盖影响', '状态', '过期时间']
    rows = db.prepare(
      `SELECT pk.id, pk.name, m.name as member_name, pk.price, pk.total_deductions, pk.used_deductions, pk.remaining_deductions, ROUND(pk.remaining_deductions * (pk.price * 1.0 / pk.total_deductions), 2) as remaining_value, (SELECT COUNT(*) FROM deduction_details dd WHERE dd.package_id = pk.id AND dd.status = 'manual_override') as manual_override_count, pk.status, pk.expires_at FROM packages pk LEFT JOIN member_accounts m ON pk.member_id = m.id WHERE pk.member_id IN (${memberIdList})${dateFilter} ORDER BY pk.created_at DESC`
    ).all(...memberIds, ...dateParams)
  }

  if (filterFormat === 'csv') {
    const csvRows = [headers.join(',')]
    for (const row of rows) {
      const values = Object.values(row).map(v => {
        const s = String(v ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
      })
      csvRows.push(values.join(','))
    }
    const csv = csvRows.join('\n')
    const bom = '\uFEFF'
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=${filterType}_${new Date().toISOString().slice(0, 10)}.csv`)
    res.send(bom + csv)
  } else {
    res.json({ success: true, data: { headers, rows } })
  }
})

export { refundRouter, exportRouter }
