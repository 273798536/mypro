import db from '../db/index.js';
import type { ImpressionLog } from '../../shared/types/index.js';

export const impressionLogDAO = {
  findByRequestId(requestId: string): ImpressionLog | undefined {
    const row = db.prepare('SELECT * FROM impression_log WHERE request_id = ?').get(requestId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      impressionTime: row.impression_time,
      createdAt: row.created_at,
    };
  },

  findById(id: string): ImpressionLog | undefined {
    const row = db.prepare('SELECT * FROM impression_log WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      impressionTime: row.impression_time,
      createdAt: row.created_at,
    };
  },

  findByChannelAndDateRange(channelId: string, startDate: string, endDate: string): ImpressionLog[] {
    const rows = db.prepare(`
      SELECT * FROM impression_log 
      WHERE channel_id = ? AND impression_time >= ? AND impression_time <= ?
      ORDER BY impression_time ASC
    `).all(channelId, startDate, endDate) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      requestId: row.request_id,
      userId: row.user_id ?? undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      impressionTime: row.impression_time,
      createdAt: row.created_at,
    }));
  },

  countByChannelAndDateRange(channelId: string, startDate: string, endDate: string): number {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM impression_log 
      WHERE channel_id = ? AND impression_time >= ? AND impression_time <= ?
    `).get(channelId, startDate, endDate) as { count: number };
    return result.count;
  },
};
