import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: 'admin' | 'operator' | 'viewer';
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;

  if (!userId || !userName) {
    res.status(401).json({
      success: false,
      error: 'Missing authentication headers (x-user-id, x-user-name)',
      timestamp: new Date().toISOString()
    });
    return;
  }

  let role: 'admin' | 'operator' | 'viewer' = 'operator';
  if (apiKey === config.admin.apiKey) {
    role = 'admin';
  }

  req.user = {
    id: userId,
    name: userName,
    role
  };

  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
}

export function requireOperator(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role === 'viewer') {
    res.status(403).json({
      success: false,
      error: 'Operator privileges required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
}
