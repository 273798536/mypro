import { prisma } from '../lib/prisma'
import { CONFIG, BatchStatus, RecordStatus, RoleType } from '../config'

interface StateTransition {
  from: BatchStatus | BatchStatus[] | null
  to: BatchStatus
  allowedRoles: RoleType[]
}

const BATCH_TRANSITIONS: StateTransition[] = [
  { from: null, to: CONFIG.BATCH_STATUS.DRAFT, allowedRoles: [CONFIG.ROLES.DATA_ENTRY] },
  { from: CONFIG.BATCH_STATUS.DRAFT, to: CONFIG.BATCH_STATUS.SUBMITTED, allowedRoles: [CONFIG.ROLES.DATA_ENTRY] },
  { from: CONFIG.BATCH_STATUS.SUBMITTED, to: CONFIG.BATCH_STATUS.REVIEWING, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: CONFIG.BATCH_STATUS.REVIEWING, to: CONFIG.BATCH_STATUS.REVIEWED, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: [CONFIG.BATCH_STATUS.SUBMITTED, CONFIG.BATCH_STATUS.REVIEWING, CONFIG.BATCH_STATUS.REVIEWED], to: CONFIG.BATCH_STATUS.FROZEN, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: CONFIG.BATCH_STATUS.FROZEN, to: CONFIG.BATCH_STATUS.SETTLED, allowedRoles: [CONFIG.ROLES.SUPERVISOR] },
  { from: [CONFIG.BATCH_STATUS.REVIEWED, CONFIG.BATCH_STATUS.FROZEN], to: CONFIG.BATCH_STATUS.REVOKED, allowedRoles: [CONFIG.ROLES.SUPERVISOR] },
  { from: CONFIG.BATCH_STATUS.SETTLED, to: CONFIG.BATCH_STATUS.ARCHIVED, allowedRoles: [CONFIG.ROLES.SUPERVISOR] },
]

interface RecordTransition {
  from: RecordStatus | RecordStatus[] | null
  to: RecordStatus
  allowedRoles: RoleType[]
}

const RECORD_TRANSITIONS: RecordTransition[] = [
  { from: null, to: CONFIG.RECORD_STATUS.PENDING, allowedRoles: [CONFIG.ROLES.DATA_ENTRY] },
  { from: CONFIG.RECORD_STATUS.PENDING, to: CONFIG.RECORD_STATUS.VALID, allowedRoles: [CONFIG.ROLES.DATA_ENTRY, CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: CONFIG.RECORD_STATUS.PENDING, to: CONFIG.RECORD_STATUS.DIRTY, allowedRoles: [CONFIG.ROLES.DATA_ENTRY, CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: CONFIG.RECORD_STATUS.DIRTY, to: CONFIG.RECORD_STATUS.RESOLVED, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: [CONFIG.RECORD_STATUS.VALID, CONFIG.RECORD_STATUS.RESOLVED], to: CONFIG.RECORD_STATUS.REVIEWED, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
  { from: [CONFIG.RECORD_STATUS.VALID, CONFIG.RECORD_STATUS.REVIEWED, CONFIG.RECORD_STATUS.RESOLVED], to: CONFIG.RECORD_STATUS.FROZEN, allowedRoles: [CONFIG.ROLES.REVIEWER, CONFIG.ROLES.SUPERVISOR] },
]

export function canTransitionBatch(
  currentStatus: BatchStatus | null,
  targetStatus: BatchStatus,
  userRole: RoleType
): boolean {
  for (const transition of BATCH_TRANSITIONS) {
    const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from]
    if (fromStates.includes(currentStatus) && transition.to === targetStatus) {
      return transition.allowedRoles.includes(userRole)
    }
  }
  return false
}

export function canTransitionRecord(
  currentStatus: RecordStatus | null,
  targetStatus: RecordStatus,
  userRole: RoleType
): boolean {
  for (const transition of RECORD_TRANSITIONS) {
    const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from]
    if (fromStates.includes(currentStatus) && transition.to === targetStatus) {
      return transition.allowedRoles.includes(userRole)
    }
  }
  return false
}

export async function transitionBatch(
  batchId: string,
  targetStatus: BatchStatus,
  userId: string,
  userRole: RoleType,
  reason?: string
) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error('批次不存在')

  const currentStatus = batch.status as BatchStatus
  if (!canTransitionBatch(currentStatus, targetStatus, userRole)) {
    throw new Error(`不允许从 ${currentStatus} 转换到 ${targetStatus}`)
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.batch.update({
      where: { id: batchId },
      data: {
        status: targetStatus,
        ...(targetStatus === CONFIG.BATCH_STATUS.FROZEN && {
          frozenAt: new Date(),
          frozenBy: userId,
          frozenRemark: reason
        }),
        ...(targetStatus === CONFIG.BATCH_STATUS.REVIEWED && {
          reviewedAt: new Date(),
          reviewedBy: userId
        }),
        ...(targetStatus === CONFIG.BATCH_STATUS.SETTLED && {
          settledAt: new Date(),
          settledBy: userId,
          settleRemark: reason
        })
      }
    })

    await tx.statusHistory.create({
      data: {
        batchId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason,
        operatorRole: userRole,
        operatedBy: userId
      }
    })

    return updated
  })
}

export async function transitionRecord(
  recordId: string,
  targetStatus: RecordStatus,
  userId: string,
  userRole: RoleType,
  reason?: string
) {
  const record = await prisma.record.findUnique({ where: { id: recordId } })
  if (!record) throw new Error('记录不存在')

  const currentStatus = record.status as RecordStatus
  if (!canTransitionRecord(currentStatus, targetStatus, userRole)) {
    throw new Error(`不允许从 ${currentStatus} 转换到 ${targetStatus}`)
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.record.update({
      where: { id: recordId },
      data: {
        status: targetStatus,
        ...(targetStatus === CONFIG.RECORD_STATUS.RESOLVED && {
          resolvedAt: new Date(),
          resolvedBy: userId,
          resolveRemark: reason
        })
      }
    })

    await tx.statusHistory.create({
      data: {
        recordId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason,
        operatorRole: userRole,
        operatedBy: userId
      }
    })

    return updated
  })
}

export async function recalculateBatchStats(batchId: string) {
  const stats = await prisma.record.groupBy({
    by: ['status'],
    where: { batchId },
    _count: true,
    _sum: { amount: true }
  })

  const statusCounts: Record<string, number> = {}
  let totalAmount = 0
  let totalCount = 0

  for (const stat of stats) {
    statusCounts[stat.status] = stat._count
    totalCount += stat._count
    totalAmount += stat._sum.amount?.toNumber() || 0
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: {
      totalCount,
      totalAmount,
      validCount: statusCounts[CONFIG.RECORD_STATUS.VALID] || 0,
      dirtyCount: statusCounts[CONFIG.RECORD_STATUS.DIRTY] || 0
    }
  })
}
