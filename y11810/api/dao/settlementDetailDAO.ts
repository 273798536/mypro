import db from '../db/index.js';
import type { SettlementDetail, DeductionItem, AttributionNode, RateHistory } from '../../shared/types/index.js';

export const settlementDetailDAO = {
  findById(id: string): SettlementDetail | undefined {
    const row = db.prepare('SELECT * FROM settlement_detail WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      runId: row.run_id,
      conversionId: row.conversion_id,
      impressionId: row.impression_id ?? undefined,
      clickId: row.click_id ?? undefined,
      channelId: row.channel_id,
      amount: row.amount,
      rate: row.rate,
      commission: row.commission,
      deductions: [],
      finalCommission: row.final_commission,
      attributionTrace: JSON.parse(row.attribution_trace) as AttributionNode[],
      rateSnapshot: JSON.parse(row.rate_snapshot) as RateHistory,
      createdAt: row.created_at,
    };
  },

  findByRunId(runId: string): SettlementDetail[] {
    const rows = db.prepare('SELECT * FROM settlement_detail WHERE run_id = ? ORDER BY created_at ASC').all(runId) as any[];
    return rows.map(row => ({
      id: row.id,
      runId: row.run_id,
      conversionId: row.conversion_id,
      impressionId: row.impression_id ?? undefined,
      clickId: row.click_id ?? undefined,
      channelId: row.channel_id,
      amount: row.amount,
      rate: row.rate,
      commission: row.commission,
      deductions: [],
      finalCommission: row.final_commission,
      attributionTrace: JSON.parse(row.attribution_trace) as AttributionNode[],
      rateSnapshot: JSON.parse(row.rate_snapshot) as RateHistory,
      createdAt: row.created_at,
    }));
  },

  findWithDeductionsByRunId(runId: string): SettlementDetail[] {
    const details = this.findByRunId(runId);
    const deductionItems = db.prepare(`
      SELECT * FROM deduction_item WHERE detail_id IN (
        SELECT id FROM settlement_detail WHERE run_id = ?
      ) ORDER BY created_at ASC
    `).all(runId) as any[];

    const deductionMap = new Map<string, DeductionItem[]>();
    for (const item of deductionItems) {
      const di: DeductionItem = {
        id: item.id,
        ruleId: item.rule_id,
        ruleName: item.rule_name,
        ruleVersion: item.rule_version,
        amount: item.amount,
        reason: item.reason,
      };
      if (!deductionMap.has(item.detail_id)) {
        deductionMap.set(item.detail_id, []);
      }
      deductionMap.get(item.detail_id)!.push(di);
    }

    return details.map(detail => ({
      ...detail,
      deductions: deductionMap.get(detail.id) || [],
    }));
  },

  create(data: Omit<SettlementDetail, 'id' | 'createdAt' | 'deductions'>): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settlement_detail (
        id, run_id, conversion_id, impression_id, click_id, channel_id,
        amount, rate, commission, final_commission, attribution_trace, rate_snapshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.runId,
      data.conversionId,
      data.impressionId ?? null,
      data.clickId ?? null,
      data.channelId,
      data.amount,
      data.rate,
      data.commission,
      data.finalCommission,
      JSON.stringify(data.attributionTrace),
      JSON.stringify(data.rateSnapshot),
      now,
    );
    return id;
  },

  addDeductionItem(detailId: string, item: Omit<DeductionItem, 'id'>): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO deduction_item (
        id, detail_id, rule_id, rule_name, rule_version, amount, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      detailId,
      item.ruleId,
      item.ruleName,
      item.ruleVersion,
      item.amount,
      item.reason,
      now,
    );
    return id;
  },

  findDeductionsByDetailId(detailId: string): DeductionItem[] {
    const rows = db.prepare('SELECT * FROM deduction_item WHERE detail_id = ? ORDER BY created_at ASC').all(detailId) as any[];
    return rows.map(row => ({
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      ruleVersion: row.rule_version,
      amount: row.amount,
      reason: row.reason,
    }));
  },

  updateFinalCommission(id: string, finalCommission: number): void {
    db.prepare('UPDATE settlement_detail SET final_commission = ? WHERE id = ?').run(finalCommission, id);
  },
};
