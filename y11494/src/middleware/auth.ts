import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, JWTPayload } from '../types';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JWTPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: '未认证' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
};

export const fieldPermissionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return next();
  }
  (req as any).fieldPermissions = getFieldPermissions(user.role);
  next();
};

export const getFieldPermissions = (role: UserRole) => {
  const permissions: Record<string, { visible: boolean; editable: boolean }> = {};
  const allFields = [
    'documentNo', 'title', 'documentType', 'amount', 'quantity',
    'supplierName', 'effectiveDate', 'expiryDate', 'filePath',
    'createdBy', 'createdAt', 'updatedAt', 'status', 'isDirty', 'version'
  ];

  switch (role) {
    case UserRole.MANAGER:
      allFields.forEach(field => {
        permissions[field] = { visible: true, editable: true };
      });
      break;
    case UserRole.REVIEWER:
      allFields.forEach(field => {
        permissions[field] = { visible: true, editable: !['createdBy', 'createdAt', 'updatedAt', 'version'].includes(field) };
      });
      break;
    case UserRole.DATA_ENTRY:
      allFields.forEach(field => {
        const isSensitive = ['amount'].includes(field);
        const isSystem = ['createdBy', 'createdAt', 'updatedAt', 'version', 'status'].includes(field);
        permissions[field] = { visible: !isSensitive, editable: !isSystem && !isSensitive };
      });
      break;
    case UserRole.READ_ONLY:
      allFields.forEach(field => {
        const isSensitive = ['amount', 'supplierName'].includes(field);
        permissions[field] = { visible: !isSensitive, editable: false };
      });
      break;
  }
  return permissions;
};

const camelToSnakeMap: Record<string, string> = {
  documentNo: 'document_no',
  documentType: 'document_type',
  supplierName: 'supplier_name',
  effectiveDate: 'effective_date',
  expiryDate: 'expiry_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  createdBy: 'created_by',
  isDirty: 'is_dirty',
  pageCount: 'page_count'
};

const snakeToCamelMap: Record<string, string> = Object.fromEntries(
  Object.entries(camelToSnakeMap).map(([k, v]) => [v, k])
);

export const filterFieldsByRole = (data: any, role: UserRole): any => {
  const permissions = getFieldPermissions(role);
  if (Array.isArray(data)) {
    return data.map(item => filterSingleItem(item, permissions));
  }
  return filterSingleItem(data, permissions);
};

const filterSingleItem = (item: any, permissions: Record<string, { visible: boolean; editable: boolean }>): any => {
  if (!item || typeof item !== 'object') return item;
  const filtered: any = {};
  for (const [key, value] of Object.entries(item)) {
    const camelKey = snakeToCamelMap[key] || key;
    if (permissions[camelKey]?.visible !== false) {
      filtered[key] = value;
    } else {
      filtered[key] = '***';
    }
  }
  return filtered;
};
