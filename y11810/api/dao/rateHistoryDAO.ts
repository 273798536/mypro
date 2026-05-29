import db from '../db/index.js';
import type { RateHistory } from '../../shared/types/index.js';

export const rateHistoryDAO = {
  findById(id: string): RateHistory | undefined {
    const row = db.prepare('SELECT * FROM rate_history WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      oldRate: row.old_rate,
      newRate: row.new_rate,
      effectiveDate: row.effective_date,
      reason: row.reason,
      operator: row.operator,
      createdAt: row.created_at,
    };
  },

  findByChannelId(channelId: string): RateHistory[] {
    const rows = db.prepare(`
      SELECT * FROM rate_history 
      WHERE channel_id = ? 
      ORDER BY effective_date DESC
    `).all(channelId) as any[];
    return rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      oldRate: row.old_rate,
      newRate: row.new_rate,
      effectiveDate: row.effective_date,
      reason: row.reason,
      operator: row.operator,
      createdAt: row.created_at,
    }));
  },

  findEffectiveRate(channelId: string, date: string): RateHistory | undefined {
    const row = db.prepare(`
      SELECT * FROM rate_history 
      WHERE channel_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC
      LIMIT 1
    `).get(channelId, date) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      oldRate: row.old_rate,
      newRate: row.new_rate,
      effectiveDate: row.effective_date,
      reason: row.reason,
      operator: row.operator,
      createdAt: row.created_at,
    };
  },

  findLatestByChannelId(channelId: string): RateHistory | undefined {
    const row = db.prepare(`
      SELECT * FROM rate_history 
      WHERE channel_id = ? 
      ORDER BY effective_date DESC
      LIMIT 1
    `).get(channelId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      channelId: row.channel_id,
      oldRate: row.old_rate,
      newRate: row.new_rate,
      effectiveDate: row.effective_date,
      reason: row.reason,
      operator: row.operator,
      createdAt: row.created_at,
    };
  },
};
