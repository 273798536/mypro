import db from '../db/index.js';
import type { ConversionOrder } from '../../shared/types/index.js';

export const conversionOrderDAO = {
  findById(id: string): ConversionOrder | undefined {
    const row = db.prepare('SELECT * FROM conversion_order WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      orderNo: row.order_no,
      clickId: row.click_id ?? undefined,
      userId: row.user_id ?? undefined,
      amount: row.amount,
      conversionTime: row.conversion_time,
      isDuplicate: row.is_duplicate === 1,
      duplicateReason: row.duplicate_reason ?? undefined,
      createdAt: row.created_at,
    };
  },

  findByClickId(clickId: string): ConversionOrder[] {
    const rows = db.prepare('SELECT * FROM conversion_order WHERE click_id = ? ORDER BY conversion_time ASC').all(clickId) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      orderNo: row.order_no,
      clickId: row.click_id ?? undefined,
      userId: row.user_id ?? undefined,
      amount: row.amount,
      conversionTime: row.conversion_time,
      isDuplicate: row.is_duplicate === 1,
      duplicateReason: row.duplicate_reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  findByOrderNo(orderNo: string): ConversionOrder | undefined {
    const row = db.prepare('SELECT * FROM conversion_order WHERE order_no = ?').get(orderNo) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      orderNo: row.order_no,
      clickId: row.click_id ?? undefined,
      userId: row.user_id ?? undefined,
      amount: row.amount,
      conversionTime: row.conversion_time,
      isDuplicate: row.is_duplicate === 1,
      duplicateReason: row.duplicate_reason ?? undefined,
      createdAt: row.created_at,
    };
  },

  findByUserIdAndTimeRange(userId: string, startTime: string, endTime: string): ConversionOrder[] {
    const rows = db.prepare(`
      SELECT * FROM conversion_order 
      WHERE user_id = ? AND conversion_time >= ? AND conversion_time <= ?
      ORDER BY conversion_time ASC
    `).all(userId, startTime, endTime) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      orderNo: row.order_no,
      clickId: row.click_id ?? undefined,
      userId: row.user_id ?? undefined,
      amount: row.amount,
      conversionTime: row.conversion_time,
      isDuplicate: row.is_duplicate === 1,
      duplicateReason: row.duplicate_reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  findByChannelAndDateRange(channelId: string, startDate: string, endDate: string): ConversionOrder[] {
    const rows = db.prepare(`
      SELECT * FROM conversion_order 
      WHERE channel_id = ? AND conversion_time >= ? AND conversion_time <= ?
      AND is_duplicate = 0
      ORDER BY conversion_time ASC
    `).all(channelId, startDate, endDate) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      orderNo: row.order_no,
      clickId: row.click_id ?? undefined,
      userId: row.user_id ?? undefined,
      amount: row.amount,
      conversionTime: row.conversion_time,
      isDuplicate: row.is_duplicate === 1,
      duplicateReason: row.duplicate_reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  updateDuplicateStatus(id: string, isDuplicate: boolean, reason?: string): void {
    db.prepare(`
      UPDATE conversion_order 
      SET is_duplicate = ?, duplicate_reason = ?
      WHERE id = ?
    `).run(isDuplicate ? 1 : 0, reason ?? null, id);
  },

  countByChannelAndDateRange(channelId: string, startDate: string, endDate: string): number {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM conversion_order 
      WHERE channel_id = ? AND conversion_time >= ? AND conversion_time <= ?
      AND is_duplicate = 0
    `).get(channelId, startDate, endDate) as { count: number };
    return result.count;
  },

  sumAmountByChannelAndDateRange(channelId: string, startDate: string, endDate: string): number {
    const result = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM conversion_order 
      WHERE channel_id = ? AND conversion_time >= ? AND conversion_time <= ?
      AND is_duplicate = 0
    `).get(channelId, startDate, endDate) as { total: number };
    return result.total;
  },
};
