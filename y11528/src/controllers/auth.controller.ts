import { Response } from 'express';
import { getRepository } from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../config/auth';
import { User, UserRole } from '../entities';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { username } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
  }

  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userRepo = getRepository(User);
    const users = await userRepo.find();

    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt
    })));
  }
}

export const authController = new AuthController();
