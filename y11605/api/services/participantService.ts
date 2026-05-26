import prisma from '../prisma'
import { createAuditLog } from './auditService'
import type { Participant, UpdateParticipantRequest } from '../../shared/types'

function parseParticipant(p: any): Participant {
  return {
    ...p,
    anomalies: p.anomalies ? JSON.parse(p.anomalies) : null,
  }
}

export async function getParticipants(
  filters: {
    tierId?: string
    payChannel?: string
    status?: string
    hasAnomalies?: boolean
    search?: string
  } = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ participants: Participant[]; total: number }> {
  const where: any = {}

  if (filters.tierId) where.tierId = filters.tierId
  if (filters.payChannel) where.payChannel = filters.payChannel
  if (filters.status) where.status = filters.status
  if (filters.hasAnomalies === true) where.anomalies = { not: null }
  if (filters.search) {
    where.OR = [
      { userName: { contains: filters.search } },
      { userPhone: { contains: filters.search } },
      { orderNo: { contains: filters.search } },
      { userId: { contains: filters.search } },
    ]
  }

  const [participants, total] = await Promise.all([
    prisma.participant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.participant.count({ where }),
  ])

  return {
    participants: participants.map(parseParticipant),
    total,
  }
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const participant = await prisma.participant.findUnique({ where: { id } })
  return participant ? parseParticipant(participant) : null
}

export async function updateParticipant(
  id: string,
  data: UpdateParticipantRequest,
  operator: string
): Promise<Participant> {
  const existing = await prisma.participant.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('参与人不存在')
  }

  if (existing.version !== data.version) {
    throw new Error('数据已被修改，请刷新后重试')
  }

  const beforeSnapshot = parseParticipant(existing)

  const updateData: any = {}
  if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount
  if (data.feeAmount !== undefined) updateData.feeAmount = data.feeAmount
  if (data.actualRefund !== undefined) updateData.actualRefund = data.actualRefund
  if (data.status) updateData.status = data.status
  updateData.version = { increment: 1 }

  const updated = await prisma.participant.update({
    where: { id },
    data: updateData,
  })

  const result = parseParticipant(updated)

  await createAuditLog(
    'participant',
    id,
    'update',
    operator,
    beforeSnapshot,
    result,
    data.reason
  )

  return result
}

export async function createParticipant(data: any, operator: string): Promise<Participant> {
  const participant = await prisma.participant.create({ data })
  const result = parseParticipant(participant)

  await createAuditLog('participant', result.id, 'create', operator, null, result, '新增参与人')

  return result
}

export async function createParticipantsBatch(
  data: any[],
  operator: string
): Promise<Participant[]> {
  const results: Participant[] = []

  for (const item of data) {
    const participant = await prisma.participant.create({ data: item })
    const result = parseParticipant(participant)
    results.push(result)

    await createAuditLog(
      'participant',
      result.id,
      'create',
      operator,
      null,
      result,
      '批量导入'
    )
  }

  return results
}

export async function getStats() {
  const [total, pending, calculated, confirmed, frozen, refunded, withAnomalies] =
    await Promise.all([
      prisma.participant.count(),
      prisma.participant.count({ where: { status: 'pending' } }),
      prisma.participant.count({ where: { status: 'calculated' } }),
      prisma.participant.count({ where: { status: 'confirmed' } }),
      prisma.participant.count({ where: { status: 'frozen' } }),
      prisma.participant.count({ where: { status: 'refunded' } }),
      prisma.participant.count({ where: { anomalies: { not: null } } }),
    ])

  const amounts = await prisma.participant.aggregate({
    _sum: {
      payAmount: true,
      refundAmount: true,
      feeAmount: true,
      actualRefund: true,
    },
  })

  return {
    counts: {
      total,
      pending,
      calculated,
      confirmed,
      frozen,
      refunded,
      withAnomalies,
    },
    amounts: {
      totalPayAmount: amounts._sum.payAmount || 0,
      totalRefundAmount: amounts._sum.refundAmount || 0,
      totalFeeAmount: amounts._sum.feeAmount || 0,
      totalActualRefund: amounts._sum.actualRefund || 0,
    },
  }
}

export async function getTiers() {
  const tiers = await prisma.participant.groupBy({
    by: ['tierId', 'tierName'],
    _count: { id: true },
    _sum: { payAmount: true },
  })

  return tiers.map((t) => ({
    tierId: t.tierId,
    tierName: t.tierName,
    count: t._count.id,
    totalAmount: t._sum.payAmount || 0,
  }))
}
