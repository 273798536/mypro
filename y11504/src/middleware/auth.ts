import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ENGINEER]: [
    'ledger:create',
    'ledger:update',
    'ledger:submit',
    'ledger:read',
    'ledger:export',
    'history:read',
  ],
  [UserRole.SERVICE_MANAGER]: [
    'ledger:create',
    'ledger:update',
    'ledger:submit',
    'ledger:confirm',
    'ledger:reject',
    'ledger:read',
    'ledger:export',
    'ledger:list',
    'history:read',
    'failed:read',
    'stats:read',
  ],
  [UserRole.AUDITOR]: [
    'ledger:audit',
    'ledger:read',
    'ledger:export',
    'ledger:list',
    'history:read',
    'history:compare',
    'stats:read',
  ],
  [UserRole.ADMIN]: [
    'ledger:*',
    'history:*',
    'failed:*',
    'stats:*',
    'export:*',
  ],
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some((p) => {
    if (p === permission) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -1);
      return permission.startsWith(prefix);
    }
    return false;
  });
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userRole = req.headers['x-user-role'] as UserRole;

  if (!userId || !userRole) {
    res.status(401).json({ error: '缺少用户认证信息' });
    return;
  }

  if (!Object.values(UserRole).includes(userRole)) {
    res.status(400).json({ error: '无效的用户角色' });
    return;
  }

  req.user = {
    id: userId,
    name: userName || userId,
    role: userRole,
  };

  next();
};

export const requirePermission = (permission: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
};

export const requireRole = (...roles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
};
