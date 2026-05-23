import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { prisma } from '../lib/prisma'
import { UserRole } from '../types/enums'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    role: UserRole
    clinicId: string | null
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string
      username: string
      role: UserRole
      clinicId: string | null
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      clinicId: user.clinicId
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: '无效的认证令牌' })
  }
}

export const requireRoles = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' })
    }

    next()
  }
}

export const rolePermissions = {
  visibleFields: {
    [UserRole.DATA_ENTRY]: [
      'id', 'batchNo', 'status', 'clinicId', 'implantBatchNumber',
      'appointmentRecordNo', 'supplierInvoiceNo', 'patientName',
      'implantModel', 'implantQuantity', 'unitPrice', 'totalAmount',
      'receiptDate', 'supplier', 'remark', 'createdAt'
    ],
    [UserRole.REVIEWER]: [
      'id', 'batchNo', 'status', 'clinicId', 'implantBatchNumber',
      'appointmentRecordNo', 'supplierInvoiceNo', 'patientName',
      'implantModel', 'implantQuantity', 'unitPrice', 'totalAmount',
      'receiptDate', 'supplier', 'remark', 'freezeReason',
      'manualReason', 'creatorId', 'reviewerId', 'createdAt', 'updatedAt'
    ],
    [UserRole.SUPERVISOR]: [
      'id', 'batchNo', 'status', 'clinicId', 'implantBatchNumber',
      'appointmentRecordNo', 'supplierInvoiceNo', 'patientName',
      'implantModel', 'originalModel', 'implantQuantity', 'unitPrice',
      'totalAmount', 'receiptDate', 'supplier', 'remark',
      'freezeReason', 'freezeBeforeStatus', 'manualReason',
      'creatorId', 'reviewerId', 'createdAt', 'updatedAt',
      'settledAt', 'archivedAt'
    ],
    [UserRole.READ_ONLY]: [
      'id', 'batchNo', 'status', 'clinicId', 'implantBatchNumber',
      'patientName', 'implantModel', 'createdAt'
    ]
  },

  allowedActions: {
    [UserRole.DATA_ENTRY]: [
      'create', 'update', 'submit', 'uploadAttachment', 'cancel'
    ],
    [UserRole.REVIEWER]: [
      'view', 'reviewApprove', 'reviewReject', 'uploadAttachment'
    ],
    [UserRole.SUPERVISOR]: [
      'view', 'reviewApprove', 'reviewReject', 'reviewOverrule',
      'freeze', 'unfreeze', 'settle', 'archive', 'restore',
      'uploadAttachment', 'export', 'handleDirtyRecord'
    ],
    [UserRole.READ_ONLY]: ['view', 'export']
  }
}

export const filterFieldsByRole = (data: any, role: UserRole): any => {
  const visibleFields = rolePermissions.visibleFields[role]
  if (!visibleFields) return data

  const filtered: any = {}
  for (const field of visibleFields) {
    if (data[field] !== undefined) {
      filtered[field] = data[field]
    }
  }
  return filtered
}
