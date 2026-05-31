import express from 'express'
import db from '../db.js'

const router = express.Router()

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword, status } = req.query
  const offset = (page - 1) * pageSize

  let whereClause = '1=1'
  const params = []

  if (keyword) {
    whereClause += ' AND (contract_no LIKE ? OR member_name LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  if (status) {
    whereClause += ' AND status = ?'
    params.push(status)
  }

  const contracts = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM entry_records WHERE contract_id = c.id) as entry_count,
      (SELECT COUNT(*) FROM freeze_applications WHERE contract_id = c.id) as freeze_count,
      (SELECT COUNT(*) FROM transfer_records WHERE contract_id = c.id) as transfer_count
    FROM membership_contracts c
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset)

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM membership_contracts WHERE ${whereClause}
  `).get(...params)

  res.json({
    data: contracts,
    total: total.count,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  })
})

router.get('/:id', (req, res) => {
  const contract = db.prepare(`
    SELECT * FROM membership_contracts WHERE id = ?
  `).get(req.params.id)

  if (!contract) {
    return res.status(404).json({ error: '合同不存在' })
  }

  const entries = db.prepare(`
    SELECT * FROM entry_records WHERE contract_id = ? ORDER BY entry_date DESC
  `).all(req.params.id)

  const freezes = db.prepare(`
    SELECT * FROM freeze_applications WHERE contract_id = ? ORDER BY freeze_start_date DESC
  `).all(req.params.id)

  const makeups = db.prepare(`
    SELECT * FROM makeup_lessons WHERE contract_id = ? ORDER BY created_at DESC
  `).all(req.params.id)

  const transfers = db.prepare(`
    SELECT * FROM transfer_records WHERE contract_id = ? ORDER BY created_at DESC
  `).all(req.params.id)

  res.json({
    ...contract,
    entries,
    freezes,
    makeups,
    transfers
  })
})

router.post('/:id/remark', (req, res) => {
  const { remark } = req.body
  
  db.prepare(`
    UPDATE membership_contracts 
    SET remark = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(remark, req.params.id)

  res.json({ success: true })
})

export default router
