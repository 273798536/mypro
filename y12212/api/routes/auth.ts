import { Router, type Request, type Response } from 'express'
import { getDb } from '../database/init.js'
import type { SystemUser, UserRole } from '../../shared/types.js'

const router = Router()

interface AuthUser {
  id: string
  username: string
  name: string
  role: UserRole
}

function generateToken(user: AuthUser): string {
  const payload = JSON.stringify({ id: user.id, username: user.username, role: user.role })
  return Buffer.from(payload).toString('base64')
}

function verifyToken(token: string): AuthUser | null {
  try {
    const payload = Buffer.from(token, 'base64').toString('utf-8')
    return JSON.parse(payload) as AuthUser
  } catch {
    return null
  }
}

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    const db = getDb()
    const user = db.prepare(
      'SELECT id, username, password, name, role FROM system_user WHERE username = ?'
    ).get(username) as (SystemUser & { password: string }) | undefined

    if (!user || user.password !== password) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const authUser: AuthUser = { id: user.id, username: user.username, name: user.name, role: user.role }
    const token = generateToken(authUser)

    res.json({
      success: true,
      data: {
        user: authUser,
        token,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/profile', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未提供认证令牌' })
      return
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      res.status(401).json({ success: false, error: '认证令牌无效' })
      return
    }

    const db = getDb()
    const dbUser = db.prepare(
      'SELECT id, username, name, role, created_at FROM system_user WHERE id = ?'
    ).get(user.id) as SystemUser | undefined

    if (!dbUser) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({ success: true, data: dbUser })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
