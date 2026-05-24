import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { AppDataSource } from '../database/data-source';
import { Role, ActionType } from '../types';
import { auditLogService } from '../services/AuditLogService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    employeeId: string;
    name: string;
    role: Role;
    department: string;
    permissions: string[];
  };
}

const PERMISSION_MATRIX: Record<Role, string[]> = {
  [Role.ADMIN]: [
    'batch:create', 'batch:read',
    'exception:create', 'exception:read', 'exception:review', 'exception:revise',
    'exception:freeze', 'exception:unfreeze', 'exception:settle',
    'exception:withdraw', 'exception:reactivate', 'exception:archive',
    'attachment:upload',
    'report:export',
    'audit:read'
  ],
  [Role.HRBP]: [
    'batch:read',
    'exception:read', 'exception:review', 'exception:revise',
    'exception:freeze', 'exception:unfreeze', 'exception:settle',
    'attachment:upload',
    'report:export'
  ],
  [Role.TRAINING_ADMIN]: [
    'batch:create', 'batch:read',
    'exception:create', 'exception:read',
    'exception:withdraw', 'exception:reactivate',
    'attachment:upload'
  ],
  [Role.DEPT_MANAGER]: [
    'exception:read',
    'exception:review',
    'attachment:upload'
  ],
  [Role.EMPLOYEE]: [
    'exception:read',
    'attachment:upload'
  ],
  [Role.AUDITOR]: [
    'batch:read',
    'exception:read', 'exception:review', 'exception:revise',
    'exception:freeze', 'exception:unfreeze',
    'attachment:upload',
    'audit:read',
    'report:export'
  ]
};

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId || !userRole) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '缺少用户认证信息'
    });
  }

  const userRepository: Repository<UserEntity> = AppDataSource.getRepository(UserEntity);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user || !user.isActive) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '用户不存在或已被禁用'
    });
  }

  req.user = {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    department: user.department,
    permissions: PERMISSION_MATRIX[user.role] || []
  };

  next();
}

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '用户未认证'
      });
    }

    if (!user.permissions.includes(permission)) {
      await auditLogService.logPermissionDenied({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: ActionType.PERMISSION_DENIED,
        resourceType: req.baseUrl,
        resourceId: req.params.id || 'unknown',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestBody: req.body,
        requiredPermission: permission
      });

      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: `权限不足：需要 ${permission} 权限`,
        currentRole: user.role,
        requiredPermission: permission
      });
    }

    next();
  };
}
