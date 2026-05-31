import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { supplierId } = req.query

  let sql = `
    SELECT c.*, s.name as supplier_name,
      (SELECT COUNT(*) FROM warnings w WHERE w.contract_id = c.id AND w.level = 'expired') as expired_warning_count
    FROM contracts c
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE 1=1
  `
  const params: any[] = []

  if (supplierId) {
    sql += ' AND c.supplier_id = ?'
    params.push(supplierId)
  }

  sql += ' ORDER BY c.created_at DESC'

  const contracts = db.prepare(sql).all(...params)

  const enriched = contracts.map((c: any) => {
    const expiry = c.guarantee_expiry_date ? new Date(c.guarantee_expiry_date) : null
    const now = new Date()
    let guaranteeStatus = 'none'
    if (expiry) {
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) guaranteeStatus = 'expired'
      else if (daysLeft <= 7) guaranteeStatus = 'expiring_soon'
      else guaranteeStatus = 'valid'
    }
    const extendBlocked = guaranteeStatus === 'expired' && c.expired_warning_count > 0
    return { ...c, guarantee_status: guaranteeStatus, extend_blocked: extendBlocked }
  })

  res.json({ success: true, data: enriched })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params

  const contract = db.prepare(`
    SELECT c.*, s.name as supplier_name
    FROM contracts c
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE c.id = ?
  `).get(id) as any

  if (!contract) {
    res.status(404).json({ success: false, error: '合同不存在' })
    return
  }

  const warnings = db.prepare('SELECT * FROM warnings WHERE contract_id = ? ORDER BY created_at DESC').all(id)
  const quotaMods = db.prepare('SELECT * FROM quota_modifications WHERE contract_id = ? ORDER BY created_at DESC').all(id)
  const histories = db.prepare("SELECT * FROM histories WHERE target_type = 'contract' AND target_id = ? ORDER BY created_at DESC").all(id)

  const expiry = contract.guarantee_expiry_date ? new Date(contract.guarantee_expiry_date) : null
  const now = new Date()
  let guaranteeStatus = 'none'
  let daysLeft: number | null = null
  if (expiry) {
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) guaranteeStatus = 'expired'
    else if (daysLeft <= 7) guaranteeStatus = 'expiring_soon'
    else guaranteeStatus = 'valid'
  }

  const expiredWarningCount = warnings.filter((w: any) => w.level === 'expired').length
  const extendBlocked = guaranteeStatus === 'expired' && expiredWarningCount > 0

  res.json({
    success: true,
    data: {
      ...contract,
      guarantee_status: guaranteeStatus,
      days_left: daysLeft,
      extend_blocked: extendBlocked,
      warnings,
      quota_modifications: quotaMods,
      histories
    }
  })
})

router.post('/:id/extend', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params
  const { extendDays, reason, operator } = req.body

  if (!extendDays || !reason || !operator) {
    res.status(400).json({ success: false, error: '延期天数、原因和操作人不能为空' })
    return
  }

  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any
  if (!contract) {
    res.status(404).json({ success: false, error: '合同不存在' })
    return
  }

  const expiry = contract.guarantee_expiry_date ? new Date(contract.guarantee_expiry_date) : null
  const now = new Date()
  const isExpired = expiry ? expiry < now : true

  if (isExpired) {
    const expiredWarnings = db.prepare("SELECT COUNT(*) as cnt FROM warnings WHERE contract_id = ? AND level = 'expired'").get(id) as { cnt: number }
    if (expiredWarnings.cnt > 0) {
      db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(`H-${Date.now()}`, 'contract', id, 'extend_blocked', operator, null, `延期${extendDays}天`, `合同延期被拦截：保函已过期，需先处理保函续期`)

      res.status(403).json({
        success: false,
        error: '保函已过期，不可延期合同。请先处理保函续期。',
        data: { extend_blocked: true }
      })
      return
    }
  }

  db.prepare('UPDATE contracts SET extend_count = extend_count + 1 WHERE id = ?').run(id)

  db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(`H-${Date.now()}`, 'contract', id, 'extend', operator, `延期${contract.extend_count}次`, `延期${contract.extend_count + 1}次`, `合同延期${extendDays}天，原因：${reason}`)

  const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id)

  res.json({ success: true, data: updated })
})

router.patch('/:id/quota', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params
  const { newAmount, reason, operator } = req.body

  if (newAmount === undefined || !reason || !operator) {
    res.status(400).json({ success: false, error: '新额度、原因和操作人不能为空' })
    return
  }

  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any
  if (!contract) {
    res.status(404).json({ success: false, error: '合同不存在' })
    return
  }

  const beforeAmount = contract.quota_used

  db.prepare('UPDATE contracts SET quota_used = ?, quota_manually_modified = 1 WHERE id = ?')
    .run(newAmount, id)

  db.prepare(`INSERT INTO quota_modifications (id, contract_id, before_amount, after_amount, reason, operator)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(`QM-${Date.now()}`, id, beforeAmount, newAmount, reason, operator)

  db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(`H-${Date.now()}`, 'contract', id, 'quota_modify', operator, String(beforeAmount), String(newAmount), `额度占用由${beforeAmount}调整为${newAmount}，原因：${reason}`)

  const relatedWarnings = db.prepare('SELECT id FROM warnings WHERE contract_id = ?').all(id) as any[]
  for (const w of relatedWarnings) {
    db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(`H-${Date.now()}-w${w.id}`, 'warning', w.id, 'quota_modify', operator, String(beforeAmount), String(newAmount), `关联合同额度变动：${beforeAmount} → ${newAmount}`)
  }

  const updated = db.prepare(`
    SELECT c.*, s.name as supplier_name
    FROM contracts c
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE c.id = ?
  `).get(id)

  const quotaMods = db.prepare('SELECT * FROM quota_modifications WHERE contract_id = ? ORDER BY created_at DESC').all(id)

  res.json({ success: true, data: Object.assign({}, updated as Record<string, unknown>, { quota_modifications: quotaMods }) })
})

export default router
