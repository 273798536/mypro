import { Request, Response, NextFunction } from 'express';

export interface UserContext {
  userId: string;
  userName: string;
  role: 'admin' | 'supervisor' | 'operator' | 'viewer';
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  supervisor: [
    'application:submit',
    'application:withdraw',
    'application:close',
    'application:view',
    'comment:add',
    'queue:view',
    'queue:manual',
    'queue:freeze',
    'deadletter:view',
    'deadletter:requeue',
    'export:all',
    'history:view'
  ],
  operator: [
    'application:submit',
    'application:view',
    'queue:view',
    'export:basic'
  ],
  viewer: [
    'application:view',
    'queue:view'
  ]
};

export function hasPermission(user: UserContext | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission) || permissions.includes('*');
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasPermission(req.user, permission)) {
      res.status(403).json({
        success: false,
        error: '权限不足',
        requiredPermission: permission
      });
      return;
    }
    next();
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userRole = (req.headers['x-user-role'] as string) || 'viewer';

  if (!userId || !userName) {
    res.status(401).json({
      success: false,
      error: '未提供用户身份信息'
    });
    return;
  }

  req.user = {
    userId,
    userName,
    role: userRole as any,
    permissions: ROLE_PERMISSIONS[userRole] || []
  };

  next();
}
