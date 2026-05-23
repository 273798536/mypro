import { ReceiptStatus, StateAction } from '../types/enums'
import { prisma } from '../lib/prisma'
import deepDiff from 'deep-diff'

export interface StateTransition {
  from: ReceiptStatus[]
  to: ReceiptStatus
  action: StateAction
  allowedRoles: string[]
}

export const stateTransitions: StateTransition[] = [
  {
    from: [],
    to: ReceiptStatus.DRAFT,
    action: StateAction.CREATE_BATCH,
    allowedRoles: ['DATA_ENTRY', 'SUPERVISOR']
  },
  {
    from: [ReceiptStatus.DRAFT],
    to: ReceiptStatus.SUBMITTED,
    action: StateAction.SUBMIT,
    allowedRoles: ['DATA_ENTRY', 'SUPERVISOR']
  },
  {
    from: [ReceiptStatus.SUBMITTED],
    to: ReceiptStatus.APPROVED,
    action: StateAction.REVIEW_APPROVE,
    allowedRoles: ['REVIEWER', 'SUPERVISOR']
  },
  {
    from: [ReceiptStatus.SUBMITTED],
    to: ReceiptStatus.REJECTED,
    action: StateAction.REVIEW_REJECT,
    allowedRoles: ['REVIEWER', 'SUPERVISOR']
  },
  {
    from: [ReceiptStatus.REJECTED, ReceiptStatus.APPROVED],
    to: ReceiptStatus.APPROVED,
    action: StateAction.REVIEW_OVERRULE,
    allowedRoles: ['SUPERVISOR']
  },
  {
    from: [ReceiptStatus.DRAFT, ReceiptStatus.SUBMITTED, ReceiptStatus.APPROVED, ReceiptStatus.REJECTED],
    to: ReceiptStatus.FROZEN,
    action: StateAction.FREEZE,
    allowedRoles: ['SUPERVISOR']
  },
  {
    from: [ReceiptStatus.FROZEN],
    to: ReceiptStatus.DRAFT,
    action: StateAction.UNFREEZE,
    allowedRoles: ['SUPERVISOR']
  },
  {
    from: [ReceiptStatus.APPROVED],
    to: ReceiptStatus.SETTLED,
    action: StateAction.SETTLE,
    allowedRoles: ['SUPERVISOR']
  },
  {
    from: [ReceiptStatus.DRAFT],
    to: ReceiptStatus.DRAFT,
    action: StateAction.CANCEL,
    allowedRoles: ['DATA_ENTRY', 'SUPERVISOR']
  },
  {
    from: [ReceiptStatus.SETTLED],
    to: ReceiptStatus.ARCHIVED,
    action: StateAction.ARCHIVE,
    allowedRoles: ['SUPERVISOR']
  },
  {
    from: [ReceiptStatus.ARCHIVED],
    to: ReceiptStatus.SETTLED,
    action: StateAction.RESTORE,
    allowedRoles: ['SUPERVISOR']
  }
]

export const canTransition = (
  currentStatus: string,
  action: StateAction,
  userRole: string
): boolean => {
  const transition = stateTransitions.find(t => t.action === action)
  if (!transition) return false

  if (!transition.allowedRoles.includes(userRole)) return false

  if (transition.from.length === 0) return true

  return transition.from.includes(currentStatus as ReceiptStatus)
}

export const getNextStatus = (action: StateAction): ReceiptStatus | null => {
  const transition = stateTransitions.find(t => t.action === action)
  return transition ? transition.to : null
}

export const recordChangeLog = async (
  receiptId: string,
  action: StateAction,
  operatorId: string,
  beforeData: any | null,
  afterData: any | null,
  reason?: string
) => {
  const diff = beforeData && afterData
    ? deepDiff.diff(beforeData, afterData)
    : null

  return prisma.changeLog.create({
    data: {
      receiptId,
      action,
      operatorId,
      beforeStatus: beforeData?.status,
      afterStatus: afterData?.status,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
      diffData: diff ? JSON.stringify(diff) : null,
      reason
    }
  })
}

export const validateReceiptData = (data: any): { valid: boolean; errors: string[]; dirtyRecords: any[] } => {
  const errors: string[] = []
  const dirtyRecords: any[] = []

  const requiredFields = ['batchNo', 'clinicId', 'implantBatchNumber', 'appointmentRecordNo', 'supplierInvoiceNo']
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`缺少必填字段: ${field}`)
      dirtyRecords.push({
        type: 'MISSING_FIELD',
        fieldName: field,
        originalValue: null
      })
    }
  }

  if (data.unitPrice && data.implantQuantity && data.totalAmount) {
    const calculatedTotal = data.unitPrice * data.implantQuantity
    if (Math.abs(calculatedTotal - data.totalAmount) > 0.01) {
      errors.push('金额冲突：单价 * 数量 与总金额不匹配')
      dirtyRecords.push({
        type: 'AMOUNT_CONFLICT',
        fieldName: 'totalAmount',
        originalValue: String(data.totalAmount),
        correctedValue: String(calculatedTotal)
      })
    }
  }

  return { valid: errors.length === 0, errors, dirtyRecords }
}
