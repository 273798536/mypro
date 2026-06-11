/**
 * 用户认证路由占位（当前项目无需登录）
 * 保留基础结构以便后续接入 JWT 认证、密码加密等功能
 */
import { Router, type Request, type Response } from 'express'

const router = Router()

router.post('/register', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ code: 501, message: '认证功能暂未实现', data: null, timestamp: new Date().toISOString() })
})

router.post('/login', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ code: 501, message: '认证功能暂未实现', data: null, timestamp: new Date().toISOString() })
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ code: 501, message: '认证功能暂未实现', data: null, timestamp: new Date().toISOString() })
})

export default router
