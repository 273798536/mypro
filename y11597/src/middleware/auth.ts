import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, OperationType, CompensationStatus } from '../types/enums';
import { User } from '../entities/User';
import { AppDataSource } from '../config/database';

interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    
    next();
  };
};

export const canPerformOperation = (user: AuthPayload, operation: OperationType, currentStatus?: CompensationStatus): boolean => {
  const role = user.role;
  
  switch (operation) {
    case OperationType.SUBMIT:
    case OperationType.UPDATE:
      return [UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR].includes(role);
    
    case OperationType.REVIEW:
    case OperationType.REJECT:
      return [UserRole.REVIEWER, UserRole.SUPERVISOR].includes(role);
    
    case OperationType.APPROVE:
    case OperationType.TAKEOVER:
    case OperationType.RECOVER:
      return role === UserRole.SUPERVISOR;
    
    case OperationType.QUEUE:
    case OperationType.RETRY:
    case OperationType.COMPENSATE:
    case OperationType.CLOSE:
      return [UserRole.REVIEWER, UserRole.SUPERVISOR].includes(role);
    
    default:
      return false;
  }
};

export const getVisibleFields = (role: UserRole): string[] => {
  const baseFields = [
    'id', 'businessKey', 'dataSource', 'sourceId', 'customerId',
    'customerName', 'compensationAmount', 'reason', 'status',
    'createdAt', 'updatedAt'
  ];

  switch (role) {
    case UserRole.SUPERVISOR:
      return [
        ...baseFields,
        'retryCount', 'maxRetryCount', 'retryCategory', 'lastError',
        'nextRetryAt', 'lastRetriedAt', 'submittedBy', 'handledBy',
        'reviewedBy', 'approvedBy', 'compensatedAt', 'reviewedAt',
        'approvedAt', 'closedAt', 'externalReceiptId', 'rawData',
        'remark', 'isBadData', 'badDataReason', 'statusHistories'
      ];
    
    case UserRole.REVIEWER:
      return [
        ...baseFields,
        'retryCount', 'retryCategory', 'lastError', 'submittedBy',
        'handledBy', 'reviewedBy', 'compensatedAt', 'remark',
        'isBadData', 'badDataReason'
      ];
    
    case UserRole.DATA_ENTRY:
      return [
        ...baseFields,
        'submittedBy', 'remark'
      ];
    
    case UserRole.READ_ONLY:
      return baseFields;
    
    default:
      return baseFields;
  }
};

export const filterFields = <T extends Record<string, any>>(obj: T, fields: string[]): Partial<T> => {
  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field as keyof T] = obj[field];
    }
  }
  return result;
};
