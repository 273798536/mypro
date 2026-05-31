import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { expenditure_id, duplicate_status } = req.query
  let invoices = db.invoices.getAll()
  if (expenditure_id) {
    invoices = invoices.filter(i => i.expenditure_id === expenditure_id)
  }
  if (duplicate_status) {
    invoices = invoices.filter(i => i.duplicate_status === duplicate_status)
  }
  res.json({ success: true, data: invoices })
})

router.get('/duplicates', (req: Request, res: Response) => {
  const duplicates = db.invoices.getAll().filter(i => i.is_duplicate || i.duplicate_status !== 'none')
  const groups: Record<string, typeof duplicates> = {}
  duplicates.forEach(inv => {
    const key = inv.duplicate_of || inv.id
    if (!groups[key]) groups[key] = []
    groups[key].push(inv)
  })
  res.json({ success: true, data: Object.values(groups) })
})

router.get('/:id', (req: Request, res: Response) => {
  const invoice = db.invoices.getById(req.params.id)
  if (!invoice) {
    return res.status(404).json({ success: false, error: '发票不存在' })
  }
  res.json({ success: true, data: invoice })
})

router.post('/', (req: Request, res: Response) => {
  const { invoice_number, amount, vendor, invoice_date, expenditure_id } = req.body
  
  const duplicates = db.invoices.findDuplicates(invoice_number, amount, vendor)
  const isDuplicate = duplicates.length > 0
  const duplicateOf = duplicates.length > 0 ? duplicates[0].id : null
  
  const invoice = db.invoices.create({
    invoice_number,
    amount,
    vendor,
    invoice_date,
    expenditure_id,
    is_duplicate: isDuplicate,
    duplicate_of: duplicateOf,
    duplicate_status: isDuplicate ? 'suspected' : 'none',
    verification_status: 'pending'
  })
  
  if (isDuplicate) {
    db.audit_logs.create({
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'create',
      old_value: null,
      new_value: JSON.stringify(invoice),
      operator: '系统自动检测',
      impact_description: `发票 ${invoice_number} 录入时检测到疑似重复，已标记待确认`
    })
  } else {
    db.audit_logs.create({
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'create',
      old_value: null,
      new_value: JSON.stringify(invoice),
      operator: req.body.operator || '系统',
      impact_description: `录入发票：${invoice_number}，金额 ${amount}`
    })
  }
  
  res.json({ success: true, data: invoice, detected_duplicate: isDuplicate })
})

router.patch('/:id/duplicate', (req: Request, res: Response) => {
  const { status, duplicate_of, operator } = req.body
  const old = db.invoices.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '发票不存在' })
  }
  
  const invoice = db.invoices.update(req.params.id, {
    duplicate_status: status,
    is_duplicate: status === 'confirmed',
    duplicate_of: duplicate_of || old.duplicate_of
  })
  
  const statusText = status === 'confirmed' ? '确认为重复' : status === 'dismissed' ? '排除重复嫌疑' : '标记为疑似'
  db.audit_logs.create({
    entity_type: 'invoice',
    entity_id: req.params.id,
    action: 'duplicate_confirm',
    old_value: JSON.stringify({ duplicate_status: old.duplicate_status }),
    new_value: JSON.stringify({ duplicate_status: status }),
    operator: operator || '系统',
    impact_description: `发票 ${old.invoice_number} ${statusText}`
  })
  
  res.json({ success: true, data: invoice })
})

router.patch('/:id/verify', (req: Request, res: Response) => {
  const { status, operator } = req.body
  const old = db.invoices.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '发票不存在' })
  }
  
  const invoice = db.invoices.update(req.params.id, { verification_status: status })
  
  const statusText = status === 'verified' ? '校验通过' : status === 'failed' ? '校验失败' : '待校验'
  db.audit_logs.create({
    entity_type: 'invoice',
    entity_id: req.params.id,
    action: 'update',
    old_value: JSON.stringify({ verification_status: old.verification_status }),
    new_value: JSON.stringify({ verification_status: status }),
    operator: operator || '系统',
    impact_description: `发票 ${old.invoice_number} 凭证${statusText}`
  })
  
  res.json({ success: true, data: invoice })
})

export default router
