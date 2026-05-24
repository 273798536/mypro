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
    from: [ReceiptStatus.SUBMITTED, ReceiptStatus.REJECTED],
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

export const validateReceiptData = (
  data: any, 
  existingData?: any, 
  options: { isPartialUpdate?: boolean } = {}
): { valid: boolean; errors: string[]; dirtyRecords: any[] } => {
  const { isPartialUpdate = false } = options
  const errors: string[] = []
  const dirtyRecords: any[] = []

  if (!isPartialUpdate) {
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
  }

  if (data.unitPrice !== undefined && data.implantQuantity !== undefined && data.totalAmount !== undefined) {
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

  if (data.implantQuantity !== undefined && data.implantQuantity !== null) {
    if (data.implantQuantity <= 0) {
      errors.push('数量冲突：种植体数量必须大于0')
      dirtyRecords.push({
        type: 'QUANTITY_CONFLICT',
        fieldName: 'implantQuantity',
        originalValue: String(data.implantQuantity),
        correctedValue: null
      })
    } else if (data.implantQuantity > 10) {
      errors.push('数量异常：种植体数量异常偏大，请确认')
      dirtyRecords.push({
        type: 'QUANTITY_CONFLICT',
        fieldName: 'implantQuantity',
        originalValue: String(data.implantQuantity),
        correctedValue: null
      })
    }
  }

  if (data.receiptDate) {
    try {
      const receiptDate = new Date(data.receiptDate)
      const today = new Date()
      const diffDays = Math.ceil(Math.abs(today.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays > 90) {
        errors.push('跨日记录：回执日期距离今天超过90天，请确认')
        dirtyRecords.push({
          type: 'CROSS_DAY',
          fieldName: 'receiptDate',
          originalValue: data.receiptDate,
          correctedValue: null
        })
      }
    } catch (e) {
    }
  }

  if (existingData && data.patientName !== undefined && existingData.patientName !== data.patientName) {
    errors.push(`患者改名：从"${existingData.patientName}"改为"${data.patientName}"`)
    dirtyRecords.push({
      type: 'NAME_CHANGED',
      fieldName: 'patientName',
      originalValue: existingData.patientName,
      correctedValue: data.patientName
    })
  }

  return { valid: errors.length === 0, errors, dirtyRecords }
}
