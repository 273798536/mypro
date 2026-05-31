import db from '../database.js'
import { v4 as uuidv4 } from 'uuid'

interface AuditLogParams {
  entityType: string
  entityId: string
  field: string
  oldValue: string
  newValue: string
  reason: string
  changedBy?: string
  impactAmount?: number
}

export function logAudit(params: AuditLogParams): string {
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, field, old_value, new_value, reason, changed_by, impact_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.entityType,
    params.entityId,
    params.field,
    params.oldValue,
    params.newValue,
    params.reason,
    params.changedBy || 'operator',
    params.impactAmount || 0,
    now
  )

  return id
}

export function getImpactAnalysis(logId: string): any {
  const log = db.prepare(`SELECT * FROM audit_logs WHERE id = ?`).get(logId) as any
  if (!log) return null

  const relatedLogs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE entity_type = ? AND entity_id = ? AND id != ?
    ORDER BY created_at DESC
  `).all(log.entity_type, log.entity_id, logId) as any[]

  let totalImpact = log.impact_amount
  for (const rl of relatedLogs) {
    totalImpact += rl.impact_amount
  }

  const currentAccrual = db.prepare(`
    SELECT * FROM vat_accruals
    WHERE country = (SELECT country FROM orders WHERE id = ? UNION SELECT country FROM returns WHERE id = ? LIMIT 1)
  `).get(log.entity_id, log.entity_id) as any

  return {
    log,
    relatedLogs,
    totalImpact,
    currentAccrual: currentAccrual || null
  }
}
