import { getDb } from "../db.js";
import type { AuditLog } from "../../shared/types.js";

export function listAuditLogs(filters: {
  entityType?: string;
  entityId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}): AuditLog[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.entityType) {
    conditions.push("entity_type = ?");
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    conditions.push("entity_id = ?");
    params.push(filters.entityId);
  }
  if (filters.action) {
    conditions.push("action = ?");
    params.push(filters.action);
  }
  if (filters.dateFrom) {
    conditions.push("created_at >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("created_at <= ?");
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC`).all(...params) as AuditLog[];
}
