import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { supplierId, status, level } = req.query

  let sql = `
    SELECT w.*, c.contract_no, c.guarantee_no, c.guarantee_expiry_date,
           c.guarantee_amount, c.quota_used, c.quota_total, c.quota_manually_modified,
           c.extend_count, c.supplier_id,
           s.name as supplier_name
    FROM warnings w
    JOIN contracts c ON w.contract_id = c.id
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE 1=1
  `
  const params: any[] = []

  if (supplierId) {
    sql += ' AND c.supplier_id = ?'
    params.push(supplierId)
  }
  if (status) {
    sql += ' AND w.status = ?'
    params.push(status)
  }
  if (level) {
    sql += ' AND w.level = ?'
    params.push(level)
  }

  sql += ' ORDER BY CASE w.level WHEN \'expired\' THEN 1 WHEN \'urgent\' THEN 2 WHEN \'warning\' THEN 3 ELSE 4 END, w.created_at DESC'

  const warnings = db.prepare(sql).all(...params)

  const enriched = warnings.map((w: any) => {
    const expiry = w.guarantee_expiry_date ? new Date(w.guarantee_expiry_date) : null
    const now = new Date()
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    return { ...w, days_left: daysLeft }
  })

  res.json({ success: true, data: enriched })
})

router.patch('/:id/confirm', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params
  const { confirmedBy } = req.body

  if (!confirmedBy) {
    res.status(400).json({ success: false, error: '确认人不能为空' })
    return
  }

  const warning = db.prepare('SELECT * FROM warnings WHERE id = ?').get(id) as any
  if (!warning) {
    res.status(404).json({ success: false, error: '预警记录不存在' })
    return
  }
  if (warning.status === 'confirmed') {
    res.status(400).json({ success: false, error: '该预警已确认，不可重复确认' })
    return
  }

  const now = new Date().toISOString()
  db.prepare('UPDATE warnings SET status = ?, confirmed_by = ?, confirmed_at = ? WHERE id = ?')
    .run('confirmed', confirmedBy, now, id)

  db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(`H-${Date.now()}`, 'warning', id, 'confirm', confirmedBy, 'pending', 'confirmed', `确认预警：${id}`)

  const updated = db.prepare(`
    SELECT w.*, c.contract_no, c.guarantee_no, c.guarantee_expiry_date,
           c.guarantee_amount, c.quota_used, c.quota_total, c.quota_manually_modified,
           c.extend_count, s.name as supplier_name
    FROM warnings w
    JOIN contracts c ON w.contract_id = c.id
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE w.id = ?
  `).get(id)

  res.json({ success: true, data: updated })
})

router.patch('/:id/remark', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params
  const { remark, modifiedBy } = req.body

  if (!modifiedBy) {
    res.status(400).json({ success: false, error: '修改人不能为空' })
    return
  }

  const warning = db.prepare('SELECT * FROM warnings WHERE id = ?').get(id) as any
  if (!warning) {
    res.status(404).json({ success: false, error: '预警记录不存在' })
    return
  }

  const beforeRemark = warning.remark || ''
  const now = new Date().toISOString()
  db.prepare('UPDATE warnings SET remark = ?, remark_modified_by = ?, remark_modified_at = ? WHERE id = ?')
    .run(remark || null, modifiedBy, now, id)

  db.prepare(`INSERT INTO histories (id, target_type, target_id, action_type, operator, before_value, after_value, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(`H-${Date.now()}`, 'warning', id, 'remark_modify', modifiedBy, beforeRemark, remark || '', `修改预警备注：${id}`)

  const updated = db.prepare(`
    SELECT w.*, c.contract_no, c.guarantee_no, c.guarantee_expiry_date,
           c.guarantee_amount, c.quota_used, c.quota_total, c.quota_manually_modified,
           c.extend_count, s.name as supplier_name
    FROM warnings w
    JOIN contracts c ON w.contract_id = c.id
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE w.id = ?
  `).get(id)

  res.json({ success: true, data: updated })
})

router.get('/export', (req: Request, res: Response) => {
  const db = getDb()
  const { supplierId, status, level } = req.query

  let sql = `
    SELECT w.id, w.level, w.status, w.remark, w.confirmed_by, w.confirmed_at,
           w.remark_modified_by, w.remark_modified_at, w.created_at,
           c.contract_no, c.guarantee_no, c.guarantee_expiry_date,
           c.guarantee_amount, c.quota_used, c.quota_total, c.quota_manually_modified,
           c.extend_count, s.name as supplier_name
    FROM warnings w
    JOIN contracts c ON w.contract_id = c.id
    JOIN suppliers s ON c.supplier_id = s.id
    WHERE 1=1
  `
  const params: any[] = []

  if (supplierId) {
    sql += ' AND c.supplier_id = ?'
    params.push(supplierId)
  }
  if (status) {
    sql += ' AND w.status = ?'
    params.push(status)
  }
  if (level) {
    sql += ' AND w.level = ?'
    params.push(level)
  }

  sql += ' ORDER BY CASE w.level WHEN \'expired\' THEN 1 WHEN \'urgent\' THEN 2 WHEN \'warning\' THEN 3 ELSE 4 END'

  const warnings = db.prepare(sql).all(...params) as any[]

  const headers = [
    '预警ID', '预警等级', '状态', '供应商', '合同编号', '保函编号',
    '保函金额', '保函到期日', '剩余天数', '额度占用', '额度总额',
    '额度是否人工修改', '延期次数', '备注', '确认人', '确认时间',
    '备注修改人', '备注修改时间', '创建时间'
  ]

  const rows = warnings.map(w => {
    const expiry = w.guarantee_expiry_date ? new Date(w.guarantee_expiry_date) : null
    const now = new Date()
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : '无保函'
    return [
      w.id,
      w.level === 'expired' ? '已过期' : w.level === 'urgent' ? '紧急' : w.level === 'warning' ? '预警' : '正常',
      w.status === 'confirmed' ? '已确认' : '待确认',
      w.supplier_name,
      w.contract_no,
      w.guarantee_no || '无',
      w.guarantee_amount || '无',
      w.guarantee_expiry_date || '无',
      daysLeft,
      w.quota_used,
      w.quota_total,
      w.quota_manually_modified ? '是 ★' : '否',
      w.extend_count,
      w.remark || '',
      w.confirmed_by || '',
      w.confirmed_at || '',
      w.remark_modified_by || '',
      w.remark_modified_at || '',
      w.created_at
    ]
  })

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF'
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=guarantee_warnings_report.csv')
  res.send(BOM + csvContent)
})

export default router
