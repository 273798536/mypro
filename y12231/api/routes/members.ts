import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status, keyword, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }
  if (keyword) {
    where += ' AND (name LIKE ? OR phone LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM member_accounts ${where}`).get(...params) as any
  const members = db.prepare(
    `SELECT * FROM member_accounts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: members, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { name, phone, balance = 0 } = req.body
  if (!name || !phone) {
    res.status(400).json({ success: false, error: '姓名和手机号必填' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.prepare(
    `INSERT INTO member_accounts (id, name, phone, balance, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`
  ).run(id, name, phone, balance, now, now)

  const member = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(id)
  res.json({ success: true, data: member })
})

router.get('/:id', (req: Request, res: Response): void => {
  const member = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(req.params.id)
  if (!member) {
    res.status(404).json({ success: false, error: '会员不存在' })
    return
  }

  const pets = db.prepare(`SELECT * FROM pet_profiles WHERE current_owner_id = ?`).all(req.params.id)
  const packages = db.prepare(`SELECT * FROM packages WHERE member_id = ?`).all(req.params.id)

  res.json({ success: true, data: { ...(member as any), pets, packages } })
})

router.put('/:id', (req: Request, res: Response): void => {
  const member = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(req.params.id)
  if (!member) {
    res.status(404).json({ success: false, error: '会员不存在' })
    return
  }

  const { name, phone, balance, status } = req.body
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const updates: string[] = []
  const params: any[] = []

  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone) }
  if (balance !== undefined) { updates.push('balance = ?'); params.push(balance) }
  if (status !== undefined) { updates.push('status = ?'); params.push(status) }
  updates.push('updated_at = ?'); params.push(now)

  if (updates.length > 1) {
    db.prepare(`UPDATE member_accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id)
  }

  const updated = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
