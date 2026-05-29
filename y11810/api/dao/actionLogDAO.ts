import db from '../db/index.js';
import type { ActionLog } from '../../shared/types/index.js';

export const actionLogDAO = {
  findById(id: string): ActionLog | undefined {
    const row = db.prepare('SELECT * FROM action_log WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      traceId: row.trace_id,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
      afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    };
  },

  findByTraceId(traceId: string): ActionLog[] {
    const rows = db.prepare(`
      SELECT * FROM action_log 
      WHERE trace_id = ? 
      ORDER BY timestamp ASC
    `).all(traceId) as any[];
    return rows.map(row => ({
      id: row.id,
      traceId: row.trace_id,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
      afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    }));
  },

  findByResource(resourceType: string, resourceId: string): ActionLog[] {
    const rows = db.prepare(`
      SELECT * FROM action_log 
      WHERE resource_type = ? AND resource_id = ?
      ORDER BY timestamp DESC
    `).all(resourceType, resourceId) as any[];
    return rows.map(row => ({
      id: row.id,
      traceId: row.trace_id,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
      afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    }));
  },

  create(data: Omit<ActionLog, 'id'>): string {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO action_log (
        id, trace_id, operator_id, operator_name, action, resource_type,
        resource_id, before_state, after_state, ip, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.traceId,
      data.operatorId,
      data.operatorName,
      data.action,
      data.resourceType,
      data.resourceId,
      data.beforeState !== undefined ? JSON.stringify(data.beforeState) : null,
      data.afterState !== undefined ? JSON.stringify(data.afterState) : null,
      data.ip,
      data.userAgent,
      data.timestamp,
    );
    return id;
  },
};
