import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ROLE_PERMISSIONS, UserContext, AuditActionType, UserRoleType, UserRole, AuditAction } from '../types';
import { AuditService } from '../services/audit.service';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const username = req.headers['x-username'] as string;

  if (!username) {
    return res.status(401).json({
      error: '未授权',
      message: '请提供用户凭证 (X-Username header)'
    });
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return res.status(401).json({
      error: '未授权',
      message: '用户不存在'
    });
  }

  req.user = {
    userId: user.id,
    username: user.username,
    role: user.role as UserRoleType,
    ipAddress: req.ip,
  };

  next();
}

export function requirePermission(action: AuditActionType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const allowedActions = ROLE_PERMISSIONS[user.role];

    if (!allowedActions.includes(action)) {
      const batchId = req.params.batchId || req.body.batchId;

      await AuditService.logPermissionDenied(action, user, batchId);

      const requiredRoles = Object.entries(ROLE_PERMISSIONS)
        .filter(([_, actions]) => actions.includes(action))
        .map(([role]) => role);

      return res.status(403).json({
        error: '权限不足',
        message: `您的角色 (${user.role}) 没有权限执行此操作: ${action}`,
        requiredRoles,
        auditLogged: true,
      });
    }

    next();
  };
}

export function requireRole(...roles: UserRoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;

    if (!roles.includes(user.role)) {
      const batchId = req.params.batchId || req.body.batchId;

      await AuditService.logPermissionDenied(AuditAction.BATCH_CREATE, user, batchId);

      return res.status(403).json({
        error: '权限不足',
        message: `此操作需要以下角色之一: ${roles.join(', ')}，您的角色是: ${user.role}`,
        requiredRoles: roles,
        auditLogged: true,
      });
    }

    next();
  };
}
