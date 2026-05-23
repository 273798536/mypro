import { createObjectCsvWriter } from 'csv-writer'
import { prisma } from '../lib/prisma'
import { ReceiptStatus } from '../types/enums'

export interface DirectorSummaryReport {
  clinicId?: string
  startDate?: Date
  endDate?: Date
}

export class ExportService {
  async getDirectorView(params: { clinicId?: string; status?: ReceiptStatus }) {
    const { clinicId, status } = params

    const where: any = {}
    if (clinicId) where.clinicId = clinicId
    if (status) where.status = status

    const receipts = await prisma.materialReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: true,
        dirtyRecords: true,
        changeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            operator: { select: { id: true, name: true } }
          }
        },
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        clinic: true
      }
    })

    const summary = {
      total: receipts.length,
      byStatus: {} as Record<string, number>,
      frozenCount: receipts.filter(r => r.status === ReceiptStatus.FROZEN).length,
      withDirtyRecords: receipts.filter(r => r.dirtyRecords.length > 0).length,
      totalAmount: receipts.reduce((sum, r) => sum + (r.totalAmount?.toNumber() || 0), 0)
    }

    for (const receipt of receipts) {
      summary.byStatus[receipt.status] = (summary.byStatus[receipt.status] || 0) + 1
    }

    return {
      summary,
      receipts: receipts.map(r => ({
        id: r.id,
        batchNo: r.batchNo,
        status: r.status,
        statusBeforeFreeze: r.freezeBeforeStatus,
        freezeReason: r.freezeReason,
        manualReason: r.manualReason,
        implantBatchNumber: r.implantBatchNumber,
        appointmentRecordNo: r.appointmentRecordNo,
        supplierInvoiceNo: r.supplierInvoiceNo,
        patientName: r.patientName,
        implantModel: r.implantModel,
        implantQuantity: r.implantQuantity,
        totalAmount: r.totalAmount,
        hasDirtyRecords: r.dirtyRecords.length > 0,
        dirtyRecordCount: r.dirtyRecords.length,
        creator: r.creator?.name,
        reviewer: r.reviewer?.name,
        clinic: r.clinic?.name,
        createdAt: r.createdAt,
        latestChanges: r.changeLogs.map(log => ({
          action: log.action,
          reason: log.reason,
          operator: log.operator?.name,
          createdAt: log.createdAt
        }))
      }))
    }
  }

  async exportToCSV(params: { clinicId?: string; startDate?: Date; endDate?: Date }) {
    const { clinicId, startDate, endDate } = params

    const where: any = {}
    if (clinicId) where.clinicId = clinicId
    if (startDate) where.createdAt = { ...where.createdAt, gte: startDate }
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate }

    const receipts = await prisma.materialReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true } },
        reviewer: { select: { name: true } },
        clinic: true
      }
    })

    const csvPath = `./exports/receipts-${Date.now()}.csv`
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'batchNo', title: '批次号' },
        { id: 'status', title: '状态' },
        { id: 'clinic', title: '院区' },
        { id: 'implantBatchNumber', title: '种植体批号' },
        { id: 'appointmentRecordNo', title: '预约记录号' },
        { id: 'supplierInvoiceNo', title: '供应商发票号' },
        { id: 'patientName', title: '患者姓名' },
        { id: 'implantModel', title: '种植体型号' },
        { id: 'implantQuantity', title: '数量' },
        { id: 'unitPrice', title: '单价' },
        { id: 'totalAmount', title: '总金额' },
        { id: 'freezeReason', title: '冻结原因' },
        { id: 'manualReason', title: '人工备注' },
        { id: 'creator', title: '创建人' },
        { id: 'reviewer', title: '复核人' },
        { id: 'createdAt', title: '创建时间' }
      ]
    })

    const records = receipts.map(r => ({
      batchNo: r.batchNo,
      status: r.status,
      clinic: r.clinic?.name || '',
      implantBatchNumber: r.implantBatchNumber || '',
      appointmentRecordNo: r.appointmentRecordNo || '',
      supplierInvoiceNo: r.supplierInvoiceNo || '',
      patientName: r.patientName || '',
      implantModel: r.implantModel || '',
      implantQuantity: r.implantQuantity || 0,
      unitPrice: r.unitPrice?.toString() || '',
      totalAmount: r.totalAmount?.toString() || '',
      freezeReason: r.freezeReason || '',
      manualReason: r.manualReason || '',
      creator: r.creator?.name || '',
      reviewer: r.reviewer?.name || '',
      createdAt: r.createdAt.toISOString()
    }))

    await csvWriter.writeRecords(records)

    return csvPath
  }

  async getFrozenReceipts(clinicId?: string) {
    const where: any = { status: ReceiptStatus.FROZEN }
    if (clinicId) where.clinicId = clinicId

    return prisma.materialReceipt.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        changeLogs: {
          where: { action: 'FREEZE' },
          take: 1
        },
        creator: { select: { name: true } },
        clinic: true
      }
    })
  }
}

export const exportService = new ExportService()
