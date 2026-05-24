import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, User } from '../types';
import dataStore from '../database/store';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = dataStore.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`权限拒绝: 用户 ${req.user.name} (${req.user.role}) 尝试访问需要 ${allowedRoles.join(', ')} 的资源`);
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }

    next();
  };
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '24h' }
  );
};

export const getVisibleFields = (role: UserRole): string[] => {
  const fieldPermissions: Record<UserRole, string[]> = {
    [UserRole.DATA_ENTRY]: [
      'id', 'applicationNo', 'applicantId', 'applicantName', 'department',
      'totalAmount', 'currency', 'items', 'status', 'materials', 'statusLogs',
      'createdAt', 'submittedBy', 'failureReason', 'failureDetails'
    ],
    [UserRole.REVIEWER]: [
      'id', 'applicationNo', 'applicantId', 'applicantName', 'department',
      'totalAmount', 'currency', 'items', 'status', 'materials', 'statusLogs',
      'createdAt', 'updatedAt', 'submittedBy', 'reviewedBy', 'reviewedAt',
      'currentRetry', 'failureReason', 'failureDetails', 'isInSummary'
    ],
    [UserRole.SUPERVISOR]: [
      'id', 'applicationNo', 'applicantId', 'applicantName', 'department',
      'travelApplicationId', 'totalAmount', 'currency', 'items', 'status',
      'materials', 'statusLogs', 'createdAt', 'updatedAt', 'submittedBy',
      'reviewedBy', 'reviewedAt', 'compensatedAt', 'closedAt', 'currentRetry',
      'failureReason', 'failureDetails', 'isInSummary'
    ],
    [UserRole.READ_ONLY]: [
      'id', 'applicationNo', 'applicantName', 'department', 'totalAmount',
      'currency', 'status', 'createdAt', 'isInSummary'
    ]
  };

  return fieldPermissions[role] || [];
};

export const getAllowedActions = (role: UserRole): string[] => {
  const actionPermissions: Record<UserRole, string[]> = {
    [UserRole.DATA_ENTRY]: [
      'create', 'view', 'upload_material', 'edit_draft'
    ],
    [UserRole.REVIEWER]: [
      'create', 'view', 'upload_material', 'review', 'approve',
      'reject', 'request_info', 'manual_retry'
    ],
    [UserRole.SUPERVISOR]: [
      'create', 'view', 'upload_material', 'review', 'approve',
      'reject', 'request_info', 'manual_retry', 'compensate',
      'close', 'resolve_dead_letter', 'view_reports', 'export'
    ],
    [UserRole.READ_ONLY]: [
      'view'
    ]
  };

  return actionPermissions[role] || [];
};

export const filterFields = <T extends Record<string, any>>(obj: T, role: UserRole): Partial<T> => {
  const visibleFields = getVisibleFields(role);
  const filtered: Partial<T> = {};
  
  for (const field of visibleFields) {
    if (field in obj) {
      filtered[field as keyof T] = obj[field as keyof T];
    }
  }
  
  return filtered;
};
