import db from '../db/index.js';
import type { ImpressionLog, ClickLog, ConversionOrder } from '../../shared/types/index.js';

interface QueryParams {
  channelId?: string;
  startDate?: string;
  endDate?: string;
  requestId?: string;
}

function mapImpressionLog(row: any): ImpressionLog {
  return {
    id: row.id,
    channelId: row.channel_id,
    requestId: row.request_id,
    userId: row.user_id,
    ip: row.ip,
    userAgent: row.user_agent,
    impressionTime: row.impression_time,
    createdAt: row.created_at,
  };
}

function mapClickLog(row: any): ClickLog {
  return {
    id: row.id,
    channelId: row.channel_id,
    requestId: row.request_id,
    impressionId: row.impression_id,
    userId: row.user_id,
    ip: row.ip,
    userAgent: row.user_agent,
    clickTime: row.click_time,
    isAnomaly: row.is_anomaly === 1,
    anomalyReason: row.anomaly_reason,
    createdAt: row.created_at,
  };
}

function mapConversionOrder(row: any): ConversionOrder {
  return {
    id: row.id,
    channelId: row.channel_id,
    orderNo: row.order_no,
    clickId: row.click_id,
    userId: row.user_id,
    amount: row.amount,
    conversionTime: row.conversion_time,
    isDuplicate: row.is_duplicate === 1,
    duplicateReason: row.duplicate_reason,
    createdAt: row.created_at,
  };
}

function buildWhereClause(params: QueryParams, timeField: string): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];

  if (params.channelId) {
    conditions.push('channel_id = ?');
    values.push(params.channelId);
  }
  if (params.startDate) {
    conditions.push(`${timeField} >= ?`);
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push(`${timeField} <= ?`);
    values.push(params.endDate);
  }
  if (params.requestId) {
    conditions.push('request_id = ?');
    values.push(params.requestId);
  }

  const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql, values };
}

export function bulkInsertImpressions(logs: Array<Omit<ImpressionLog, 'createdAt'>>): void {
  const stmt = db.prepare(`
    INSERT INTO impression_log (id, channel_id, request_id, user_id, ip, user_agent, impression_time, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const transaction = db.transaction((items: typeof logs) => {
    for (const log of items) {
      stmt.run(
        log.id,
        log.channelId,
        log.requestId,
        log.userId ?? null,
        log.ip,
        log.userAgent,
        log.impressionTime,
        now
      );
    }
  });
  transaction(logs);
}

export function findImpressions(params: QueryParams = {}): ImpressionLog[] {
  const { sql, values } = buildWhereClause(params, 'impression_time');
  const stmt = db.prepare(`SELECT * FROM impression_log ${sql} ORDER BY impression_time DESC`);
  const rows = stmt.all(...values);
  return rows.map(mapImpressionLog);
}

export function bulkInsertClicks(logs: Array<Omit<ClickLog, 'createdAt'>>): void {
  const stmt = db.prepare(`
    INSERT INTO click_log (id, channel_id, request_id, impression_id, user_id, ip, user_agent, click_time, is_anomaly, anomaly_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const transaction = db.transaction((items: typeof logs) => {
    for (const log of items) {
      stmt.run(
        log.id,
        log.channelId,
        log.requestId,
        log.impressionId ?? null,
        log.userId ?? null,
        log.ip,
        log.userAgent,
        log.clickTime,
        log.isAnomaly ? 1 : 0,
        log.anomalyReason ?? null,
        now
      );
    }
  });
  transaction(logs);
}

export function findClicks(params: QueryParams = {}): ClickLog[] {
  const { sql, values } = buildWhereClause(params, 'click_time');
  const stmt = db.prepare(`SELECT * FROM click_log ${sql} ORDER BY click_time DESC`);
  const rows = stmt.all(...values);
  return rows.map(mapClickLog);
}

export function createConversion(conversion: Omit<ConversionOrder, 'createdAt'>): ConversionOrder {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO conversion_order (id, channel_id, order_no, click_id, user_id, amount, conversion_time, is_duplicate, duplicate_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    conversion.id,
    conversion.channelId,
    conversion.orderNo,
    conversion.clickId ?? null,
    conversion.userId ?? null,
    conversion.amount,
    conversion.conversionTime,
    conversion.isDuplicate ? 1 : 0,
    conversion.duplicateReason ?? null,
    now
  );
  return { ...conversion, createdAt: now };
}

export function bulkInsertConversions(orders: Array<Omit<ConversionOrder, 'createdAt'>>): void {
  const stmt = db.prepare(`
    INSERT INTO conversion_order (id, channel_id, order_no, click_id, user_id, amount, conversion_time, is_duplicate, duplicate_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const transaction = db.transaction((items: typeof orders) => {
    for (const order of items) {
      stmt.run(
        order.id,
        order.channelId,
        order.orderNo,
        order.clickId ?? null,
        order.userId ?? null,
        order.amount,
        order.conversionTime,
        order.isDuplicate ? 1 : 0,
        order.duplicateReason ?? null,
        now
      );
    }
  });
  transaction(orders);
}

export function findConversions(params: QueryParams = {}): ConversionOrder[] {
  const { sql, values } = buildWhereClause(params, 'conversion_time');
  const stmt = db.prepare(`SELECT * FROM conversion_order ${sql} ORDER BY conversion_time DESC`);
  const rows = stmt.all(...values);
  return rows.map(mapConversionOrder);
}

export function checkClickMissing(channelId: string, startDate: string, endDate: string): { missingCount: number; totalConversions: number } {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_conversions,
      SUM(CASE WHEN click_id IS NULL THEN 1 ELSE 0 END) as missing_count
    FROM conversion_order
    WHERE channel_id = ?
      AND conversion_time >= ?
      AND conversion_time <= ?
  `);
  const row = stmt.get(channelId, startDate, endDate) as any;
  return {
    missingCount: row.missing_count ?? 0,
    totalConversions: row.total_conversions ?? 0,
  };
}
