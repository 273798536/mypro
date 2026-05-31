import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const { keyword } = req.query

  let sql = 'SELECT * FROM suppliers WHERE 1=1'
  const params: any[] = []

  if (keyword) {
    sql += ' AND (name LIKE ? OR contact_person LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  sql += ' ORDER BY name'

  const suppliers = db.prepare(sql).all(...params)

  const enriched = suppliers.map((s: any) => {
    const missingFields: string[] = []
    if (!s.contact_person) missingFields.push('联系人')
    if (!s.contact_phone) missingFields.push('联系电话')
    if (!s.address) missingFields.push('地址')
    return { ...s, missing_fields: missingFields }
  })

  res.json({ success: true, data: enriched })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any
  if (!supplier) {
    res.status(404).json({ success: false, error: '供应商不存在' })
    return
  }

  const missingFields: string[] = []
  if (!supplier.contact_person) missingFields.push('联系人')
  if (!supplier.contact_phone) missingFields.push('联系电话')
  if (!supplier.address) missingFields.push('地址')

  const contracts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM warnings w WHERE w.contract_id = c.id AND w.level = 'expired') as expired_warning_count,
      (SELECT COUNT(*) FROM warnings w WHERE w.contract_id = c.id) as total_warning_count
    FROM contracts c
    WHERE c.supplier_id = ?
    ORDER BY c.created_at DESC
  `).all(id)

  const quotaMods = db.prepare(`
    SELECT qm.* FROM quota_modifications qm
    JOIN contracts c ON qm.contract_id = c.id
    WHERE c.supplier_id = ?
    ORDER BY qm.created_at DESC
  `).all(id)

  res.json({
    success: true,
    data: {
      ...supplier,
      missing_fields: missingFields,
      contracts,
      quota_modifications: quotaMods
    }
  })
})

export default router
