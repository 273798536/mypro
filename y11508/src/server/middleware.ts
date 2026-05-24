import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { rolePermissions, filterFieldsByRole, canTransitionStatus } from '../permissions';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: Role;
    department: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const username = req.headers['x-user'] as string;

  if (!username) {
    res.status(401).json({
      success: false,
      error: '未提供用户身份'
    });
    return;
  }

  const mockUsers: Record<string, { role: Role; department: string }> = {
    admin: { role: Role.SUPERVISOR, department: '设备科' },
    reviewer01: { role: Role.REVIEWER, department: '设备科' },
    entry01: { role: Role.DATA_ENTRY, department: '设备科' },
    entry02: { role: Role.DATA_ENTRY, department: '检验科' },
    viewer01: { role: Role.READ_ONLY, department: '院感科' },
    nurse_head: { role: Role.SUPERVISOR, department: '护理部' }
  };

  const userInfo = mockUsers[username] || { role: Role.READ_ONLY, department: '未知' };

  req.user = {
    id: username,
    username,
    role: userInfo.role,
    department: userInfo.department
  };

  next();
}

export function requirePermission(
  entityType: keyof typeof rolePermissions[Role.DATA_ENTRY],
  action: string
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未授权'
      });
      return;
    }

    const permissions = rolePermissions[req.user.role][entityType];
    const actionPerm = permissions.actions[action];

    if (!actionPerm || !actionPerm.allowed) {
      res.status(403).json({
        success: false,
        error: '权限不足'
      });
      return;
    }

    next();
  };
}

export function filterResponse<T extends Record<string, any>>(
  data: T,
  role: Role,
  entityType: keyof typeof rolePermissions[Role.DATA_ENTRY]
): Partial<T> {
  return filterFieldsByRole(data, role, entityType);
}

export function checkStatusTransition(
  fromStatus: string,
  toStatus: string,
  role: Role
): boolean {
  return canTransitionStatus(fromStatus as any, toStatus as any, role);
}