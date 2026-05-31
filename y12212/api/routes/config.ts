import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database/init.js'
import { getTierPrices } from '../services/tierPricing.js'
import type { TierPrice, SystemUser, UserProfile, UserRole } from '../../shared/types.js'

const router = Router()

router.get('/prices', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const prices = db.prepare('SELECT * FROM tier_price ORDER BY user_type, tier ASC').all() as TierPrice[]
    res.json({ success: true, data: prices })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/prices/:id', (req: Request, res: Response): void => {
  try {
    const { price_per_ton, min_usage, max_usage, effective_date } = req.body

    const db = getDb()
    const existing = db.prepare('SELECT * FROM tier_price WHERE id = ?').get(req.params.id) as TierPrice | undefined
    if (!existing) {
      res.status(404).json({ success: false, error: '阶梯价格不存在' })
      return
    }

    db.prepare(
      'UPDATE tier_price SET price_per_ton = ?, min_usage = ?, max_usage = ?, effective_date = ? WHERE id = ?'
    ).run(
      price_per_ton ?? existing.price_per_ton,
      min_usage ?? existing.min_usage,
      max_usage ?? existing.max_usage,
      effective_date ?? existing.effective_date,
      req.params.id
    )

    const updated = db.prepare('SELECT * FROM tier_price WHERE id = ?').get(req.params.id) as TierPrice
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/users', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const users = db.prepare('SELECT id, username, name, role, created_at FROM system_user ORDER BY created_at ASC').all() as SystemUser[]
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/users', (req: Request, res: Response): void => {
  try {
    const { username, password, name, role } = req.body
    if (!username || !password || !name || !role) {
      res.status(400).json({ success: false, error: '用户名、密码、姓名和角色不能为空' })
      return
    }

    const validRoles: UserRole[] = ['reviewer', 'supervisor', 'admin']
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: '无效的用户角色' })
      return
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM system_user WHERE username = ?').get(username)
    if (existing) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO system_user (id, username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, username, password, name, role, now)

    const user = db.prepare('SELECT id, username, name, role, created_at FROM system_user WHERE id = ?').get(id) as SystemUser
    res.status(201).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/profiles', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const profiles = db.prepare('SELECT * FROM user_profile ORDER BY user_no ASC').all() as UserProfile[]
    res.json({ success: true, data: profiles })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
