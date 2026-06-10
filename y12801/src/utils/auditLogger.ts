import type { AuditLog } from '@/types'

let logCounter = 100

export function createAuditLog(params: {
  entityType: AuditLog['entityType']
  entityId: string
  action: string
  operator: string
  detail: string
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
}): AuditLog {
  logCounter++
  return {
    id: `LOG-${String(logCounter).padStart(4, '0')}`,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    operator: params.operator,
    operatedAt: new Date().toISOString(),
    detail: params.detail,
    beforeData: params.beforeData ?? null,
    afterData: params.afterData ?? null,
  }
}
