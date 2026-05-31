import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'music-warning-system-secret-key-2024';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'teacher' | 'consultant';
    name: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '认证令牌无效或已过期'
    });
  }
}

export function requireRole(...roles: Array<'admin' | 'teacher' | 'consultant'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }
    
    next();
  };
}

export function generateToken(user: { id: string; username: string; role: string; name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
