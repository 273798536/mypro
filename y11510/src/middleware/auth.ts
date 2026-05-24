import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userRole = req.headers['x-user-role'] as Role;

  if (!userId || !userName || !userRole) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing authentication headers',
    });
  }

  if (!Object.values(Role).includes(userRole)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid role',
    });
  }

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
  };

  next();
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
