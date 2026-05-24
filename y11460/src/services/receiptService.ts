import { ReceiptStatus, StateAction, DirtyType } from '../types/enums'
import { prisma } from '../lib/prisma'
import { canTransition, getNextStatus, recordChangeLog, validateReceiptData } from './stateMachine'

export class ReceiptService {
  async createBatch(data: any, creatorId: string, clinicId: string) {
    const existing = await prisma.materialReceipt.findUnique({
      where: { batchNo: data.batchNo }
    })
    if (existing) {
      throw new Error('批次号已存在')
    }

    const validation = validateReceiptData(data)

    const receipt = await prisma.materialReceipt.create({
      data: {
        batchNo: data.batchNo,
        clinicId: data.clinicId || clinicId,
        implantBatchNumber: data.implantBatchNumber,
        appointmentRecordNo: data.appointmentRecordNo,
        supplierInvoiceNo: data.supplierInvoiceNo,
        patientName: data.patientName,
        implantModel: data.implantModel,
        originalModel: data.originalModel,
        implantQuantity: data.implantQuantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
        supplier: data.supplier,
        remark: data.remark,
        creatorId,
        status: ReceiptStatus.DRAFT
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!validation.valid) {
      for (const dirty of validation.dirtyRecords) {
        await prisma.dirtyRecord.create({
          data: {
            receiptId: receipt.id,
            type: dirty.type,
            fieldName: dirty.fieldName,
            originalValue: dirty.originalValue
          }
        })
      }
    }

    await recordChangeLog(
      receipt.id,
      StateAction.CREATE_BATCH,
      creatorId,
      null,
      receipt,
      '创建批次'
    )

    return receipt
  }

  async updateBatch(receiptId: string, data: any, operatorId: string, userRole: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (receipt.status !== ReceiptStatus.DRAFT) {
      throw new Error('仅草稿状态可修改')
    }

    const validation = validateReceiptData(data, receipt, { isPartialUpdate: true })

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        implantBatchNumber: data.implantBatchNumber !== undefined ? data.implantBatchNumber : receipt.implantBatchNumber,
        appointmentRecordNo: data.appointmentRecordNo !== undefined ? data.appointmentRecordNo : receipt.appointmentRecordNo,
        supplierInvoiceNo: data.supplierInvoiceNo !== undefined ? data.supplierInvoiceNo : receipt.supplierInvoiceNo,
        patientName: data.patientName !== undefined ? data.patientName : receipt.patientName,
        implantModel: data.implantModel !== undefined ? data.implantModel : receipt.implantModel,
        originalModel: data.originalModel !== undefined ? data.originalModel : receipt.originalModel,
        implantQuantity: data.implantQuantity !== undefined ? data.implantQuantity : receipt.implantQuantity,
        unitPrice: data.unitPrice !== undefined ? data.unitPrice : receipt.unitPrice,
        totalAmount: data.totalAmount !== undefined ? data.totalAmount : receipt.totalAmount,
        receiptDate: data.receiptDate !== undefined ? new Date(data.receiptDate) : receipt.receiptDate,
        supplier: data.supplier !== undefined ? data.supplier : receipt.supplier,
        remark: data.remark !== undefined ? data.remark : receipt.remark
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (validation.dirtyRecords.length > 0) {
      for (const dirty of validation.dirtyRecords) {
        await prisma.dirtyRecord.create({
          data: {
            receiptId: receipt.id,
            type: dirty.type,
            fieldName: dirty.fieldName,
            originalValue: dirty.originalValue,
            correctedValue: dirty.correctedValue
          }
        })
      }
    }

    await recordChangeLog(
      receiptId,
      StateAction.CREATE_BATCH,
      operatorId,
      beforeData,
      updated,
      '更新批次信息'
    )

    return updated
  }

  async submitForReview(receiptId: string, operatorId: string, userRole: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.SUBMIT, userRole)) {
      throw new Error('当前状态不允许提交或权限不足')
    }

    const beforeData = { ...receipt }
    const nextStatus = getNextStatus(StateAction.SUBMIT)!

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: { status: nextStatus },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.SUBMIT,
      operatorId,
      beforeData,
      updated,
      '提交复核'
    )

    return updated
  }

  async review(receiptId: string, approved: boolean, reviewerId: string, userRole: string, reason?: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    const action = approved ? StateAction.REVIEW_APPROVE : StateAction.REVIEW_REJECT

    if (!canTransition(receipt.status, action, userRole)) {
      throw new Error('当前状态不允许复核或权限不足')
    }

    const beforeData = { ...receipt }
    const nextStatus = getNextStatus(action)!

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: nextStatus,
        reviewerId,
        manualReason: reason
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      action,
      reviewerId,
      beforeData,
      updated,
      reason || (approved ? '复核通过' : '复核驳回')
    )

    return updated
  }

  async reviewOverrule(receiptId: string, supervisorId: string, reason?: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.REVIEW_OVERRULE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许改判或权限不足')
    }

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.APPROVED,
        reviewerId: supervisorId,
        manualReason: reason
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.REVIEW_OVERRULE,
      supervisorId,
      beforeData,
      updated,
      reason || '主管改判'
    )

    return updated
  }

  async freeze(receiptId: string, supervisorId: string, reason: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.FREEZE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许冻结或权限不足')
    }

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.FROZEN,
        freezeBeforeStatus: receipt.status,
        freezeReason: reason
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.FREEZE,
      supervisorId,
      beforeData,
      updated,
      reason
    )

    return updated
  }

  async unfreeze(receiptId: string, supervisorId: string, reason?: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.UNFREEZE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许解冻或权限不足')
    }

    const beforeData = { ...receipt }
    const targetStatus = receipt.freezeBeforeStatus || ReceiptStatus.DRAFT

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: targetStatus,
        freezeBeforeStatus: null,
        freezeReason: null
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.UNFREEZE,
      supervisorId,
      beforeData,
      updated,
      reason || '解冻'
    )

    return updated
  }

  async settle(receiptId: string, supervisorId: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.SETTLE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许结算或权限不足')
    }

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.SETTLED,
        settledAt: new Date()
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.SETTLE,
      supervisorId,
      beforeData,
      updated,
      '完成结算'
    )

    return updated
  }

  async cancel(receiptId: string, operatorId: string, userRole: string, reason?: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.CANCEL, userRole)) {
      throw new Error('当前状态不允许撤回或权限不足')
    }

    const beforeData = { ...receipt }
    const nextStatus = getNextStatus(StateAction.CANCEL)!

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: { 
        status: nextStatus,
        reviewerId: null
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.CANCEL,
      operatorId,
      beforeData,
      updated,
      reason || '撤回单据'
    )

    return updated
  }

  async archive(receiptId: string, supervisorId: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.ARCHIVE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许归档或权限不足')
    }

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.ARCHIVED,
        archivedAt: new Date()
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.ARCHIVE,
      supervisorId,
      beforeData,
      updated,
      '归档'
    )

    return updated
  }

  async restore(receiptId: string, supervisorId: string) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    if (!canTransition(receipt.status, StateAction.RESTORE, 'SUPERVISOR')) {
      throw new Error('当前状态不允许恢复或权限不足')
    }

    const beforeData = { ...receipt }

    const updated = await prisma.materialReceipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.SETTLED,
        archivedAt: null
      },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.RESTORE,
      supervisorId,
      beforeData,
      updated,
      '恢复已归档单据'
    )

    return updated
  }

  async getById(receiptId: string) {
    return prisma.materialReceipt.findUnique({
      where: { id: receiptId },
      include: {
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        },
        dirtyRecords: {
          orderBy: { createdAt: 'desc' }
        },
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            operator: {
              select: { id: true, name: true }
            }
          }
        },
        creator: {
          select: { id: true, name: true }
        },
        reviewer: {
          select: { id: true, name: true }
        }
      }
    })
  }

  async list(params: {
    clinicId?: string
    status?: string
    page?: number
    pageSize?: number
  }) {
    const { clinicId, status, page = 1, pageSize = 20 } = params
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (clinicId) where.clinicId = clinicId
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.materialReceipt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          attachments: true,
          dirtyRecords: true,
          creator: { select: { id: true, name: true } }
        }
      }),
      prisma.materialReceipt.count({ where })
    ])

    return { items, total, page, pageSize }
  }

  async updateDirtyRecord(
    dirtyRecordId: string,
    supervisorId: string,
    data: { handleOpinion: string; correctedValue?: string }
  ) {
    const dirtyRecord = await prisma.dirtyRecord.findUnique({
      where: { id: dirtyRecordId }
    })
    if (!dirtyRecord) {
      throw new Error('脏记录不存在')
    }

    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: dirtyRecord.receiptId }
    })
    if (!receipt) {
      throw new Error('关联回执不存在')
    }

    const beforeData = { ...receipt }
    const updateData: any = {}

    if (data.correctedValue && dirtyRecord.fieldName) {
      const fieldName = dirtyRecord.fieldName
      const fieldValue = data.correctedValue

      switch (fieldName) {
        case 'implantQuantity':
          updateData[fieldName] = parseInt(fieldValue, 10)
          break
        case 'unitPrice':
        case 'totalAmount':
          updateData[fieldName] = parseFloat(fieldValue)
          break
        case 'receiptDate':
          updateData[fieldName] = new Date(fieldValue)
          break
        default:
          updateData[fieldName] = fieldValue
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.materialReceipt.update({
        where: { id: dirtyRecord.receiptId },
        data: updateData
      })
    }

    const updatedDirtyRecord = await prisma.dirtyRecord.update({
      where: { id: dirtyRecordId },
      data: {
        correctedValue: data.correctedValue,
        handleOpinion: data.handleOpinion,
        handled: true,
        handledBy: supervisorId,
        handledAt: new Date()
      },
      include: { receipt: true }
    })

    await recordChangeLog(
      dirtyRecord.receiptId,
      StateAction.REVIEW_OVERRULE,
      supervisorId,
      beforeData,
      { ...beforeData, ...updateData },
      `处理脏记录: ${dirtyRecord.type} - ${dirtyRecord.fieldName || ''} - ${data.handleOpinion}`
    )

    return updatedDirtyRecord
  }

  async getChangeLogs(receiptId: string) {
    return prisma.changeLog.findMany({
      where: { receiptId },
      orderBy: { createdAt: 'desc' },
      include: {
        operator: {
          select: { id: true, name: true, role: true }
        }
      }
    })
  }
}

export const receiptService = new ReceiptService()
