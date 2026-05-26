import prisma from '../prisma'
import { createAuditLog } from './auditService'
import type { RefundBatch, BatchItem, CreateBatchRequest } from '../../shared/types'

function parseBatch(b: any): RefundBatch {
  return {
    ...b,
    items: b.items?.map((item: any) => ({
      ...item,
      participant: item.participant
        ? {
            ...item.participant,
            anomalies: item.participant.anomalies
              ? JSON.parse(item.participant.anomalies)
              : null,
          }
        : undefined,
    })),
  }
}

export async function getBatches(
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ batches: RefundBatch[]; total: number }> {
  const where: any = {}
  if (status) where.status = status

  const [batches, total] = await Promise.all([
    prisma.refundBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.refundBatch.count({ where }),
  ])

  return {
    batches: batches.map((b) => ({
      ...parseBatch(b),
      items: undefined,
      itemCount: (b as any)._count.items,
    })),
    total,
  }
}

export async function getBatch(id: string): Promise<RefundBatch | null> {
  const batch = await prisma.refundBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          participant: true,
        },
      },
    },
  })

  return batch ? parseBatch(batch) : null
}

export async function createBatch(
  data: CreateBatchRequest,
  operator: string
): Promise<RefundBatch> {
  const participants = await prisma.participant.findMany({
    where: { id: { in: data.participantIds } },
  })

  if (participants.length !== data.participantIds.length) {
    throw new Error('部分参与人不存在')
  }

  const existingBatchItems = await prisma.batchItem.findMany({
    where: {
      participantId: { in: data.participantIds },
      batch: {
        status: { in: ['pending', 'frozen', 'executing'] },
      },
    },
  })

  if (existingBatchItems.length > 0) {
    const duplicateIds = existingBatchItems.map((item) => item.participantId)
    const duplicateParticipants = participants.filter((p) => duplicateIds.includes(p.id))
    const names = duplicateParticipants.map((p) => p.userName).join('、')
    throw new Error(`以下参与人已在其他活跃批次中：${names}`)
  }

  const totalAmount = participants.reduce((sum, p) => sum + (p.refundAmount || 0), 0)
  const totalFee = participants.reduce((sum, p) => sum + (p.feeAmount || 0), 0)
  const totalActualRefund = participants.reduce((sum, p) => sum + (p.actualRefund || 0), 0)

  const batch = await prisma.refundBatch.create({
    data: {
      name: data.name,
      ruleId: data.ruleId,
      totalAmount,
      totalFee,
      totalActualRefund,
      createdBy: operator,
      items: {
        create: participants.map((p) => ({
          participantId: p.id,
          snapshotRefundAmount: p.refundAmount || 0,
          snapshotFeeAmount: p.feeAmount || 0,
          snapshotActualRefund: p.actualRefund || 0,
        })),
      },
    },
  })

  await createAuditLog('batch', batch.id, 'create', operator, null, batch, '创建退款批次')

  return parseBatch(batch)
}

export async function freezeBatch(id: string, operator: string): Promise<RefundBatch> {
  const existing = await prisma.refundBatch.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('批次不存在')
  }

  if (existing.status === 'frozen') {
    throw new Error('批次已冻结')
  }

  const beforeSnapshot = { ...existing }

  const batch = await prisma.refundBatch.update({
    where: { id },
    data: {
      status: 'frozen',
      frozenAt: new Date(),
      frozenBy: operator,
    },
  })

  await createAuditLog('batch', id, 'freeze', operator, beforeSnapshot, batch, '冻结批次')

  return parseBatch(batch)
}

export async function unfreezeBatch(id: string, operator: string): Promise<RefundBatch> {
  const existing = await prisma.refundBatch.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('批次不存在')
  }

  if (existing.status !== 'frozen') {
    throw new Error('批次未冻结')
  }

  const beforeSnapshot = { ...existing }

  const batch = await prisma.refundBatch.update({
    where: { id },
    data: {
      status: 'pending',
      frozenAt: null,
      frozenBy: null,
    },
  })

  await createAuditLog('batch', id, 'unfreeze', operator, beforeSnapshot, batch, '解冻批次')

  return parseBatch(batch)
}

export async function executeBatch(id: string, operator: string): Promise<RefundBatch> {
  const existing = await prisma.refundBatch.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('批次不存在')
  }

  if (existing.status === 'frozen') {
    throw new Error('批次已冻结，请先解冻')
  }

  if (existing.status === 'completed') {
    throw new Error('批次已执行')
  }

  const beforeSnapshot = { ...existing }

  const batch = await prisma.refundBatch.update({
    where: { id },
    data: {
      status: 'completed',
      executedAt: new Date(),
    },
  })

  await prisma.batchItem.findMany({ where: { batchId: id } }).then(async (items) => {
    for (const item of items) {
      const participantBefore = await prisma.participant.findUnique({
        where: { id: item.participantId },
      })
      if (participantBefore) {
        const participantAfter = await prisma.participant.update({
          where: { id: item.participantId },
          data: { status: 'refunded' },
        })
        await createAuditLog(
          'participant',
          item.participantId,
          'refund',
          operator,
          participantBefore,
          participantAfter,
          `批次执行：${batch.name}`
        )
      }
    }
  })

  await createAuditLog('batch', id, 'execute', operator, beforeSnapshot, batch, '执行批次退款')

  return parseBatch(batch)
}
