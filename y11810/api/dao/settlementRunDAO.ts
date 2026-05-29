import db from '../db/index.js';
import type { SettlementRun } from '../../shared/types/index.js';

export const settlementRunDAO = {
  findById(id: string): SettlementRun | undefined {
    const row = db.prepare('SELECT * FROM settlement_run WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      batchNo: row.batch_no,
      channelId: row.channel_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as SettlementRun['status'],
      totalImpressions: row.total_impressions,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      totalAmount: row.total_amount,
      deductionAmount: row.deduction_amount,
      finalAmount: row.final_amount,
      baseRunId: row.base_run_id ?? undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    };
  },

  findByBatchNo(batchNo: string): SettlementRun | undefined {
    const row = db.prepare('SELECT * FROM settlement_run WHERE batch_no = ?').get(batchNo) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      batchNo: row.batch_no,
      channelId: row.channel_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as SettlementRun['status'],
      totalImpressions: row.total_impressions,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      totalAmount: row.total_amount,
      deductionAmount: row.deduction_amount,
      finalAmount: row.final_amount,
      baseRunId: row.base_run_id ?? undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    };
  },

  create(data: Omit<SettlementRun, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settlement_run (
        id, batch_no, channel_id, start_date, end_date, status,
        total_impressions, total_clicks, total_conversions, total_amount,
        deduction_amount, final_amount, base_run_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.batchNo,
      data.channelId,
      data.startDate,
      data.endDate,
      data.status,
      data.totalImpressions,
      data.totalClicks,
      data.totalConversions,
      data.totalAmount,
      data.deductionAmount,
      data.finalAmount,
      data.baseRunId ?? null,
      now,
    );
    return id;
  },

  updateStatus(id: string, status: SettlementRun['status']): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE settlement_run 
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, status === 'completed' || status === 'failed' ? now : null, id);
  },

  updateTotals(id: string, totals: Partial<Pick<SettlementRun, 'totalImpressions' | 'totalClicks' | 'totalConversions' | 'totalAmount' | 'deductionAmount' | 'finalAmount'>>): void {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (totals.totalImpressions !== undefined) {
      updates.push('total_impressions = ?');
      params.push(totals.totalImpressions);
    }
    if (totals.totalClicks !== undefined) {
      updates.push('total_clicks = ?');
      params.push(totals.totalClicks);
    }
    if (totals.totalConversions !== undefined) {
      updates.push('total_conversions = ?');
      params.push(totals.totalConversions);
    }
    if (totals.totalAmount !== undefined) {
      updates.push('total_amount = ?');
      params.push(totals.totalAmount);
    }
    if (totals.deductionAmount !== undefined) {
      updates.push('deduction_amount = ?');
      params.push(totals.deductionAmount);
    }
    if (totals.finalAmount !== undefined) {
      updates.push('final_amount = ?');
      params.push(totals.finalAmount);
    }
    
    params.push(id);
    db.prepare(`UPDATE settlement_run SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  },

  findByChannelAndDateRange(channelId: string, startDate: string, endDate: string): SettlementRun[] {
    const rows = db.prepare(`
      SELECT * FROM settlement_run 
      WHERE channel_id = ? AND start_date >= ? AND end_date <= ?
      ORDER BY created_at DESC
    `).all(channelId, startDate, endDate) as any[];
    return rows.map(row => ({
      id: row.id,
      batchNo: row.batch_no,
      channelId: row.channel_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as SettlementRun['status'],
      totalImpressions: row.total_impressions,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      totalAmount: row.total_amount,
      deductionAmount: row.deduction_amount,
      finalAmount: row.final_amount,
      baseRunId: row.base_run_id ?? undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    }));
  },

  findAll(): SettlementRun[] {
    const rows = db.prepare('SELECT * FROM settlement_run ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      batchNo: row.batch_no,
      channelId: row.channel_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status as SettlementRun['status'],
      totalImpressions: row.total_impressions,
      totalClicks: row.total_clicks,
      totalConversions: row.total_conversions,
      totalAmount: row.total_amount,
      deductionAmount: row.deduction_amount,
      finalAmount: row.final_amount,
      baseRunId: row.base_run_id ?? undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    }));
  },
};
