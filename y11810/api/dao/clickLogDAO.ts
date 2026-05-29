import db from '../db/index.js';
import type { ClickLog } from '../../shared/types/index.js';

export const clickLogDAO = {
  findById(id: string): ClickLog | undefined {
    const row = db.prepare('SELECT * FROM click_log WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      impressionId: row.impression_id ?? undefined,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      clickTime: row.click_time,
      isAnomaly: row.is_anomaly === 1,
      anomalyReason: row.anomaly_reason ?? undefined,
      createdAt: row.created_at,
    };
  },

  findByRequestId(requestId: string): ClickLog | undefined {
    const row = db.prepare('SELECT * FROM click_log WHERE request_id = ?').get(requestId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      impressionId: row.impression_id ?? undefined,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      clickTime: row.click_time,
      isAnomaly: row.is_anomaly === 1,
      anomalyReason: row.anomaly_reason ?? undefined,
      createdAt: row.created_at,
    };
  },

  findByUserIdAndTimeRange(userId: string, startTime: string, endTime: string): ClickLog[] {
    const rows = db.prepare(`
      SELECT * FROM click_log 
      WHERE user_id = ? AND click_time >= ? AND click_time <= ?
      ORDER BY click_time ASC
    `).all(userId, startTime, endTime) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      impressionId: row.impression_id ?? undefined,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      clickTime: row.click_time,
      isAnomaly: row.is_anomaly === 1,
      anomalyReason: row.anomaly_reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  findByChannelAndDateRange(channelId: string, startDate: string, endDate: string): ClickLog[] {
    const rows = db.prepare(`
      SELECT * FROM click_log 
      WHERE channel_id = ? AND click_time >= ? AND click_time <= ?
      ORDER BY click_time ASC
    `).all(channelId, startDate, endDate) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      impressionId: row.impression_id ?? undefined,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      clickTime: row.click_time,
      isAnomaly: row.is_anomaly === 1,
      anomalyReason: row.anomaly_reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  findByImpressionId(impressionId: string): ClickLog | undefined {
    const row = db.prepare('SELECT * FROM click_log WHERE impression_id = ?').get(impressionId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      impressionId: row.impression_id ?? undefined,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      clickTime: row.click_time,
      isAnomaly: row.is_anomaly === 1,
      anomalyReason: row.anomaly_reason ?? undefined,
      createdAt: row.created_at,
    };
  },

  updateAnomalyStatus(id: string, isAnomaly: boolean, reason?: string): void {
    db.prepare(`
      UPDATE click_log 
      SET is_anomaly = ?, anomaly_reason = ?
      WHERE id = ?
    `).run(isAnomaly ? 1 : 0, reason ?? null, id);
  },

  countByChannelAndDateRange(channelId: string, startDate: string, endDate: string): number {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM click_log 
      WHERE channel_id = ? AND click_time >= ? AND click_time <= ?
    `).get(channelId, startDate, endDate) as { count: number };
    return result.count;
  },
};
