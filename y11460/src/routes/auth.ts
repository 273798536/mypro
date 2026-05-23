import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { prisma } from '../lib/prisma'
import { config } from '../config'

const router = Router()

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, password } = req.body

      const user = await prisma.user.findUnique({
        where: { username }
      })

      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' })
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          clinicId: user.clinicId
        },
        config.jwtSecret as string,
        { expiresIn: config.jwtExpiresIn } as any
      )

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: '服务器内部错误' })
    }
  }
)

router.get('/profile', async (req: any, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未认证' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        clinicId: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }

    res.json(user)
  } catch (error) {
    res.status(401).json({ error: '无效的认证令牌' })
  }
})

export default router
