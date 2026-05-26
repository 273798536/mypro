import prisma from '../prisma'
import type { AuditLog } from '../../shared/types'

export async function createAuditLog(
  entityType: 'participant' | 'batch' | 'rule',
  entityId: string,
  action: string,
  operator: string,
  beforeSnapshot: any = null,
  afterSnapshot: any = null,
  reason: string | null = null
): Promise<AuditLog> {
  const log = await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      beforeSnapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
      afterSnapshot: afterSnapshot ? JSON.stringify(afterSnapshot) : null,
      operator,
      reason,
    },
  })

  return {
    ...log,
    entityType: log.entityType as 'participant' | 'batch' | 'rule',
    timestamp: log.timestamp.toISOString(),
    beforeSnapshot: log.beforeSnapshot ? JSON.parse(log.beforeSnapshot) : null,
    afterSnapshot: log.afterSnapshot ? JSON.parse(log.afterSnapshot) : null,
  } as unknown as AuditLog
}

export async function getAuditLogs(
  entityType?: string,
  entityId?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ logs: AuditLog[]; total: number }> {
  const where: any = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs: logs.map((log) => ({
      ...log,
      entityType: log.entityType as 'participant' | 'batch' | 'rule',
      timestamp: log.timestamp.toISOString(),
      beforeSnapshot: log.beforeSnapshot ? JSON.parse(log.beforeSnapshot) : null,
      afterSnapshot: log.afterSnapshot ? JSON.parse(log.afterSnapshot) : null,
    })) as unknown as AuditLog[],
    total,
  }
}

export async function getParticipantHistory(participantId: string): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'participant',
      entityId: participantId,
    },
    orderBy: { timestamp: 'desc' },
  })

  return logs.map((log) => ({
    ...log,
    entityType: log.entityType as 'participant' | 'batch' | 'rule',
    timestamp: log.timestamp.toISOString(),
    beforeSnapshot: log.beforeSnapshot ? JSON.parse(log.beforeSnapshot) : null,
    afterSnapshot: log.afterSnapshot ? JSON.parse(log.afterSnapshot) : null,
  })) as unknown as AuditLog[]
}
