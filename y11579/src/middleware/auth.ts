import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { Role } from '../types';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: Role;
    name: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: '无效的认证令牌' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (!AuthService.hasPermission(req.user.role, roles)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
}
