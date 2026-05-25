import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { UserRole, AuditAction } from '../models/types';
import { canPerformAction } from '../config/permissions';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    realName: string;
    role: UserRole;
    department: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromQuery = req.query.token as string;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      realName: decoded.realName,
      role: decoded.role,
      department: decoded.department
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: '无效的认证令牌' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    next();
  };
}

export function requirePermission(action: AuditAction) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    
    if (!canPerformAction(req.user.role, action)) {
      return res.status(403).json({ error: `没有${action}操作权限` });
    }
    
    next();
  };
}
