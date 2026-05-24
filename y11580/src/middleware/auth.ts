import { Request, Response, NextFunction } from 'express'
import { CONFIG, RoleType } from '../config'

export interface AuthUser {
  id: string
  username: string
  role: RoleType
  storeId?: string
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  [CONFIG.ROLES.DATA_ENTRY]: [
    'batch:create',
    'batch:update',
    'batch:submit',
    'record:create',
    'record:update',
    'attachment:upload',
    'attachment:view',
    'batch:view',
    'record:view'
  ],
  [CONFIG.ROLES.REVIEWER]: [
    'batch:view',
    'record:view',
    'attachment:view',
    'batch:review',
    'record:review',
    'record:resolve',
    'batch:freeze'
  ],
  [CONFIG.ROLES.SUPERVISOR]: [
    'batch:*',
    'record:*',
    'attachment:*',
    'audit:view',
    'export:*'
  ],
  [CONFIG.ROLES.READ_ONLY]: [
    'batch:view',
    'record:view',
    'attachment:view'
  ]
}

const FIELD_VISIBILITY: Record<RoleType, { batch: string[]; record: string[] }> = {
  [CONFIG.ROLES.DATA_ENTRY]: {
    batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdBy', 'createdAt', 'attachments'],
    record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'phone', 'amount', 'quantity', 'transactionDate', 'operator', 'status', 'source', 'createdAt']
  },
  [CONFIG.ROLES.REVIEWER]: {
    batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdBy', 'reviewedBy', 'reviewedAt', 'frozenRemark', 'frozenAt', 'frozenBy', 'createdAt', 'attachments', 'statusHistories'],
    record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'phone', 'amount', 'quantity', 'transactionDate', 'operator', 'originalContent', 'status', 'dirtyType', 'dirtyRemark', 'resolveRemark', 'source', 'createdBy', 'createdAt', 'statusHistories']
  },
  [CONFIG.ROLES.SUPERVISOR]: {
    batch: ['*'],
    record: ['*']
  },
  [CONFIG.ROLES.READ_ONLY]: {
    batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdAt'],
    record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'amount', 'status', 'createdAt']
  }
}

export function hasPermission(role: RoleType, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role] || []
  if (rolePerms.includes('*')) return true
  if (rolePerms.includes(permission)) return true
  
  const [resource, action] = permission.split(':')
  return rolePerms.includes(`${resource}:*`)
}

export function filterFieldsByRole<T extends Record<string, any>>(
  data: T,
  role: RoleType,
  entityType: 'batch' | 'record'
): Partial<T> {
  const allowedFields = FIELD_VISIBILITY[role][entityType]
  
  if (allowedFields.includes('*')) return data
  
  const filtered: Partial<T> = {}
  for (const field of allowedFields) {
    if (field in data) {
      filtered[field as keyof T] = data[field]
    }
  }
  return filtered
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授权访问' })
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: '权限不足' })
    }
    
    next()
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string
  const username = req.headers['x-username'] as string
  const role = req.headers['x-role'] as RoleType
  const storeId = req.headers['x-store-id'] as string

  if (!userId || !username || !role) {
    return res.status(401).json({ error: '缺少认证信息' })
  }

  if (!Object.values(CONFIG.ROLES).includes(role)) {
    return res.status(400).json({ error: '无效的角色' })
  }

  req.user = { id: userId, username, role, storeId }
  next()
}
