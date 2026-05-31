import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { species, ownerId, keyword, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (species) {
    where += ' AND species = ?'
    params.push(species)
  }
  if (ownerId) {
    where += ' AND current_owner_id = ?'
    params.push(ownerId)
  }
  if (keyword) {
    where += ' AND (name LIKE ? OR breed LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM pet_profiles ${where}`).get(...params) as any
  const pets = db.prepare(
    `SELECT p.*, m.name as owner_name FROM pet_profiles p LEFT JOIN member_accounts m ON p.current_owner_id = m.id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: pets, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { name, species, breed = '', currentOwnerId } = req.body
  if (!name || !species || !currentOwnerId) {
    res.status(400).json({ success: false, error: '宠物名称、种类和主人必填' })
    return
  }

  const owner = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(currentOwnerId)
  if (!owner) {
    res.status(400).json({ success: false, error: '主人账户不存在' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.prepare(
    `INSERT INTO pet_profiles (id, name, species, breed, current_owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, species, breed, currentOwnerId, now)

  const pet = db.prepare(`SELECT p.*, m.name as owner_name FROM pet_profiles p LEFT JOIN member_accounts m ON p.current_owner_id = m.id WHERE p.id = ?`).get(id)
  res.json({ success: true, data: pet })
})

router.post('/:id/ownership-change', (req: Request, res: Response): void => {
  const petId = req.params.id
  const { newOwnerId, reason = '' } = req.body

  if (!newOwnerId) {
    res.status(400).json({ success: false, error: '新主人必填' })
    return
  }

  const pet = db.prepare(`SELECT * FROM pet_profiles WHERE id = ?`).get(petId) as any
  if (!pet) {
    res.status(404).json({ success: false, error: '宠物不存在' })
    return
  }

  const newOwner = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(newOwnerId)
  if (!newOwner) {
    res.status(400).json({ success: false, error: '新主人账户不存在' })
    return
  }

  if (pet.current_owner_id === newOwnerId) {
    res.status(400).json({ success: false, error: '新主人不能与当前主人相同' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const changeId = uuidv4()
  db.prepare(
    `INSERT INTO ownership_changes (id, pet_id, previous_owner_id, new_owner_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(changeId, petId, pet.current_owner_id, newOwnerId, reason, now)

  const exceptionId = uuidv4()
  const prevOwner = db.prepare(`SELECT * FROM member_accounts WHERE id = ?`).get(pet.current_owner_id) as any
  db.prepare(
    `INSERT INTO exception_items (id, type, severity, related_member_id, related_pet_id, description, status, created_at) VALUES (?, 'ownership_change', 'warning', ?, ?, ?, 'pending', ?)`
  ).run(exceptionId, pet.current_owner_id, petId, `${pet.name}所有权变更待确认：${prevOwner.name}→${(newOwner as any).name}`, now)

  const change = db.prepare(`SELECT * FROM ownership_changes WHERE id = ?`).get(changeId)
  res.json({ success: true, data: change })
})

router.put('/ownership-changes/:id', (req: Request, res: Response): void => {
  const changeId = req.params.id
  const { status, confirmedBy = '管理员' } = req.body

  if (!['confirmed', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '状态只能为confirmed或rejected' })
    return
  }

  const change = db.prepare(`SELECT * FROM ownership_changes WHERE id = ?`).get(changeId) as any
  if (!change) {
    res.status(404).json({ success: false, error: '所有权变更记录不存在' })
    return
  }

  if (change.status !== 'pending') {
    res.status(400).json({ success: false, error: '只能处理待审核的变更' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.prepare(
    `UPDATE ownership_changes SET status = ?, confirmed_by = ?, confirmed_at = ? WHERE id = ?`
  ).run(status, confirmedBy, now, changeId)

  if (status === 'confirmed') {
    db.prepare(
      `UPDATE pet_profiles SET current_owner_id = ? WHERE id = ?`
    ).run(change.new_owner_id, change.pet_id)
  }

  db.prepare(
    `UPDATE exception_items SET status = ?, resolved_by = ?, resolved_at = ? WHERE related_pet_id = ? AND type = 'ownership_change' AND status = 'pending'`
  ).run(status === 'confirmed' ? 'resolved' : 'rejected', confirmedBy, now, change.pet_id)

  const updated = db.prepare(`SELECT * FROM ownership_changes WHERE id = ?`).get(changeId)
  res.json({ success: true, data: updated })
})

export default router
