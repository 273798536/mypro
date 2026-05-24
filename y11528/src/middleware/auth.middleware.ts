import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthTokenPayload } from '../config/auth';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { rolePermissions } = require('../config/auth');
    const permissions = rolePermissions[req.user.role] || [];

    if (!permissions.includes(permission)) {
      res.status(403).json({ 
        error: 'Permission denied',
        required: permission,
        role: req.user.role 
      });
      return;
    }

    next();
  };
};
