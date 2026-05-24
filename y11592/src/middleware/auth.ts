import { Request, Response, NextFunction } from 'express';

export interface UserContext {
  userId: string;
  userName?: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const roles = (req.headers['x-user-roles'] as string)?.split(',') || [];
  const permissions = (req.headers['x-user-permissions'] as string)?.split(',') || [];

  if (!userId) {
    res.status(401).json({
      success: false,
      error: '未授权：缺少用户标识',
    });
    return;
  }

  req.user = {
    userId,
    userName,
    roles,
    permissions,
  };

  next();
};

export const requirePermission = (permission: string) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未授权',
      });
      return;
    }

    if (!req.user.permissions.includes(permission) && 
        !req.user.roles.includes('admin')) {
      res.status(403).json({
        success: false,
        error: `无权限：需要 ${permission} 权限`,
      });
      return;
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未授权',
      });
      return;
    }

    if (!req.user.roles.includes(role) && 
        !req.user.roles.includes('admin')) {
      res.status(403).json({
        success: false,
        error: `无权限：需要 ${role} 角色`,
      });
      return;
    }

    next();
  };
};
