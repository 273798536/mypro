import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { createAuditLog } from '../dao/auditLogDao';

export interface AuthContext {
  userId: string;
  userName: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ['ledger:create', 'ledger:read', 'ledger:update', 'ledger:delete', 'ledger:submit', 'ledger:reject', 'ledger:confirm', 'audit:read', 'task:manage', 'export:all'],
  [Role.MANAGER]: ['ledger:create', 'ledger:read', 'ledger:update', 'ledger:submit', 'ledger:reject', 'ledger:confirm', 'audit:read', 'export:sensitive'],
  [Role.OPERATOR]: ['ledger:create', 'ledger:read', 'ledger:update', 'ledger:submit'],
  [Role.AUDITOR]: ['ledger:read', 'audit:read', 'export:masked'],
  [Role.GUEST]: ['ledger:read']
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const role = req.headers['x-user-role'] as Role;

  if (!userId || !userName || !role) {
    res.status(401).json({
      success: false,
      error: '未提供认证信息，请在请求头中包含 x-user-id, x-user-name, x-user-role'
    });
    return;
  }

  if (!Object.values(Role).includes(role)) {
    res.status(400).json({
      success: false,
      error: '无效的角色类型'
    });
    return;
  }

  req.auth = { userId, userName, role };
  next();
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: '未认证'
      });
      return;
    }

    const permissions = ROLE_PERMISSIONS[req.auth.role] || [];
    const hasPermission = permissions.includes(permission);

    await createAuditLog({
      userId: req.auth.userId,
      userName: req.auth.userName,
      role: req.auth.role,
      action: permission,
      resourceType: req.baseUrl + req.path,
      resourceId: req.params.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      success: hasPermission,
      denyReason: hasPermission ? undefined : `角色 ${req.auth.role} 没有 ${permission} 权限`,
      requestData: JSON.stringify(req.body).substring(0, 500)
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: `权限不足：您的角色是 ${req.auth.role}，需要 ${permission} 权限才能执行此操作。该操作已被审计记录。`
      });
      return;
    }

    next();
  };
}

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
