import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import prisma from '../prisma'
import { createAuditLog } from './auditService'
import type { ExportRecord, ExportType } from '../../shared/types'

const EXPORT_DIR = path.join(process.cwd(), 'exports')

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true })
}

function parseExportRecord(r: any): ExportRecord {
  return {
    ...r,
    filters: r.filters ? JSON.parse(r.filters) : null,
  }
}

export async function exportRefundDetails(
  batchId: string | null,
  filters: any,
  operator: string
): Promise<ExportRecord> {
  let participants: any[]

  if (batchId) {
    const batch = await prisma.refundBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          include: { participant: true },
        },
      },
    })

    if (!batch) {
      throw new Error('批次不存在')
    }

    participants = batch.items.map((item) => ({
      ...item.participant,
      snapshotRefundAmount: item.snapshotRefundAmount,
      snapshotFeeAmount: item.snapshotFeeAmount,
      snapshotActualRefund: item.snapshotActualRefund,
      batchName: batch.name,
    }))
  } else {
    const where: any = {}
    if (filters.tierId) where.tierId = filters.tierId
    if (filters.payChannel) where.payChannel = filters.payChannel
    if (filters.status) where.status = filters.status

    participants = await prisma.participant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  const data = participants.map((p) => ({
    订单号: p.orderNo,
    用户ID: p.userId,
    姓名: p.userName,
    手机号: p.userPhone,
    档位: p.tierName,
    支付渠道: p.payChannel === 'alipay' ? '支付宝' : p.payChannel === 'wechat' ? '微信' : '银行卡',
    支付金额: p.payAmount,
    早鸟折扣: p.earlyBirdDiscount,
    赠品价值: p.giftValue,
    赠品已发货: p.giftShipped ? '是' : '否',
    应退金额: p.snapshotRefundAmount ?? p.refundAmount ?? '',
    手续费: p.snapshotFeeAmount ?? p.feeAmount ?? '',
    实际退款: p.snapshotActualRefund ?? p.actualRefund ?? '',
    状态: getStatusText(p.status),
    异常: p.anomalies ? JSON.parse(p.anomalies).join('、') : '',
    批次: (p as any).batchName || '',
    创建时间: new Date(p.createdAt).toLocaleString('zh-CN'),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '退款明细')

  const fileName = `退款明细_${new Date().toISOString().slice(0, 10)}_${Date.now()}.xlsx`
  const filePath = path.join(EXPORT_DIR, fileName)
  XLSX.writeFile(wb, filePath)

  const fileSize = fs.statSync(filePath).size

  const record = await prisma.exportRecord.create({
    data: {
      type: 'refund_detail' as ExportType,
      batchId,
      filters: JSON.stringify(filters),
      filePath,
      fileSize,
      createdBy: operator,
    },
  })

  await createAuditLog(
    'batch',
    batchId || 'all',
    'export',
    operator,
    null,
    { fileName, fileSize },
    '导出退款明细'
  )

  return parseExportRecord(record)
}

export async function exportAllocationReport(
  batchId: string,
  operator: string
): Promise<ExportRecord> {
  const batch = await prisma.refundBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        include: { participant: true },
      },
    },
  })

  if (!batch) {
    throw new Error('批次不存在')
  }

  const summaryData = [
    { 项目: '批次名称', 值: batch.name },
    { 项目: '创建时间', 值: new Date(batch.createdAt).toLocaleString('zh-CN') },
    { 项目: '创建人', 值: batch.createdBy },
    { 项目: '状态', 值: getStatusText(batch.status) },
    { 项目: '参与人数', 值: batch.items.length },
    { 项目: '应退总金额', 值: batch.totalAmount },
    { 项目: '手续费总额', 值: batch.totalFee },
    { 项目: '实际退款总额', 值: batch.totalActualRefund },
  ]

  const channelSummary: Record<string, { count: number; amount: number; fee: number }> = {}
  const tierSummary: Record<string, { count: number; amount: number }> = {}

  for (const item of batch.items) {
    const channel = item.participant.payChannel
    if (!channelSummary[channel]) {
      channelSummary[channel] = { count: 0, amount: 0, fee: 0 }
    }
    channelSummary[channel].count++
    channelSummary[channel].amount += item.snapshotActualRefund
    channelSummary[channel].fee += item.snapshotFeeAmount

    const tier = item.participant.tierName
    if (!tierSummary[tier]) {
      tierSummary[tier] = { count: 0, amount: 0 }
    }
    tierSummary[tier].count++
    tierSummary[tier].amount += item.snapshotActualRefund
  }

  const channelData = Object.entries(channelSummary).map(([channel, data]) => ({
    支付渠道: channel === 'alipay' ? '支付宝' : channel === 'wechat' ? '微信' : '银行卡',
    人数: data.count,
    实际退款: data.amount,
    手续费: data.fee,
  }))

  const tierData = Object.entries(tierSummary).map(([tier, data]) => ({
    档位: tier,
    人数: data.count,
    实际退款: data.amount,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), '汇总')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(channelData), '按渠道汇总')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tierData), '按档位汇总')

  const fileName = `分摊报告_${batch.name}_${Date.now()}.xlsx`
  const filePath = path.join(EXPORT_DIR, fileName)
  XLSX.writeFile(wb, filePath)

  const fileSize = fs.statSync(filePath).size

  const record = await prisma.exportRecord.create({
    data: {
      type: 'allocation_report' as ExportType,
      batchId,
      filters: null,
      filePath,
      fileSize,
      createdBy: operator,
    },
  })

  await createAuditLog(
    'batch',
    batchId,
    'export',
    operator,
    null,
    { fileName, fileSize },
    '导出发分摊报告'
  )

  return parseExportRecord(record)
}

export async function getExportRecords(
  page: number = 1,
  pageSize: number = 20
): Promise<{ records: ExportRecord[]; total: number }> {
  const [records, total] = await Promise.all([
    prisma.exportRecord.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exportRecord.count(),
  ])

  return {
    records: records.map(parseExportRecord),
    total,
  }
}

export async function getExportFilePath(id: string): Promise<string | null> {
  const record = await prisma.exportRecord.findUnique({ where: { id } })
  if (!record) return null

  if (!fs.existsSync(record.filePath)) {
    return null
  }

  return record.filePath
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待计算',
    calculated: '已计算',
    confirmed: '已确认',
    frozen: '已冻结',
    refunded: '已退款',
    draft: '草稿',
    executing: '执行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}
