import db from '../db/index.js';
import type {
  SettlementRun,
  SettlementDetail,
  DeductionItem,
  DeductionRule,
  AttributionNode,
  RateHistory,
} from '../../shared/types/index.js';

interface RunQueryParams {
  channelId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

function mapSettlementRun(row: any): SettlementRun {
  return {
    id: row.id,
    batchNo: row.batch_no,
    channelId: row.channel_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as 'pending' | 'running' | 'completed' | 'failed',
    totalImpressions: row.total_impressions,
    totalClicks: row.total_clicks,
    totalConversions: row.total_conversions,
    totalAmount: row.total_amount,
    deductionAmount: row.deduction_amount,
    finalAmount: row.final_amount,
    baseRunId: row.base_run_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapDeductionRule(row: any): DeductionRule {
  return {
    id: row.id,
    name: row.name,
    type: row.type as 'click_anomaly' | 'duplicate_conversion' | 'ip_fraud' | 'time_abnormal' | 'custom',
    condition: row.condition,
    deductionRate: row.deduction_rate,
    version: row.version,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeductionItem(row: any): DeductionItem {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    ruleVersion: row.rule_version,
    amount: row.amount,
    reason: row.reason,
  };
}

function mapSettlementDetail(row: any): Omit<SettlementDetail, 'deductions'> {
  let attributionTrace: AttributionNode[] = [];
  let rateSnapshot: RateHistory | null = null;

  try {
    if (row.attribution_trace) {
      attributionTrace = JSON.parse(row.attribution_trace);
    }
  } catch (e) {
    attributionTrace = [];
  }

  try {
    if (row.rate_snapshot) {
      rateSnapshot = JSON.parse(row.rate_snapshot);
    }
  } catch (e) {
    rateSnapshot = null;
  }

  return {
    id: row.id,
    runId: row.run_id,
    conversionId: row.conversion_id,
    impressionId: row.impression_id,
    clickId: row.click_id,
    channelId: row.channel_id,
    amount: row.amount,
    rate: row.rate,
    commission: row.commission,
    finalCommission: row.final_commission,
    attributionTrace,
    rateSnapshot: rateSnapshot as RateHistory,
    createdAt: row.created_at,
  };
}

function buildRunWhereClause(params: RunQueryParams): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];

  if (params.channelId) {
    conditions.push('channel_id = ?');
    values.push(params.channelId);
  }
  if (params.startDate) {
    conditions.push('start_date >= ?');
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push('end_date <= ?');
    values.push(params.endDate);
  }
  if (params.status) {
    conditions.push('status = ?');
    values.push(params.status);
  }

  const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql, values };
}

export function createRun(run: Omit<SettlementRun, 'createdAt'>): SettlementRun {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO settlement_run (
      id, batch_no, channel_id, start_date, end_date, status,
      total_impressions, total_clicks, total_conversions, total_amount,
      deduction_amount, final_amount, base_run_id, created_at, completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    run.id,
    run.batchNo,
    run.channelId,
    run.startDate,
    run.endDate,
    run.status,
    run.totalImpressions,
    run.totalClicks,
    run.totalConversions,
    run.totalAmount,
    run.deductionAmount,
    run.finalAmount,
    run.baseRunId ?? null,
    now,
    run.completedAt ?? null
  );
  return { ...run, createdAt: now };
}

export function updateRun(id: string, data: Partial<Omit<SettlementRun, 'id' | 'createdAt'>>): SettlementRun {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.totalImpressions !== undefined) {
    fields.push('total_impressions = ?');
    values.push(data.totalImpressions);
  }
  if (data.totalClicks !== undefined) {
    fields.push('total_clicks = ?');
    values.push(data.totalClicks);
  }
  if (data.totalConversions !== undefined) {
    fields.push('total_conversions = ?');
    values.push(data.totalConversions);
  }
  if (data.totalAmount !== undefined) {
    fields.push('total_amount = ?');
    values.push(data.totalAmount);
  }
  if (data.deductionAmount !== undefined) {
    fields.push('deduction_amount = ?');
    values.push(data.deductionAmount);
  }
  if (data.finalAmount !== undefined) {
    fields.push('final_amount = ?');
    values.push(data.finalAmount);
  }
  if (data.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(data.completedAt);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE settlement_run SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  const updated = findRunById(id);
  if (!updated) {
    throw new Error(`Settlement run ${id} not found after update`);
  }
  return updated;
}

export function findRuns(params: RunQueryParams = {}): SettlementRun[] {
  const { sql, values } = buildRunWhereClause(params);
  const stmt = db.prepare(`SELECT * FROM settlement_run ${sql} ORDER BY created_at DESC`);
  const rows = stmt.all(...values);
  return rows.map(mapSettlementRun);
}

export function findRunById(id: string): SettlementRun | undefined {
  const stmt = db.prepare('SELECT * FROM settlement_run WHERE id = ?');
  const row = stmt.get(id);
  return row ? mapSettlementRun(row) : undefined;
}

export function bulkInsertDetails(details: Array<Omit<SettlementDetail, 'deductions' | 'createdAt'>>): void {
  const stmt = db.prepare(`
    INSERT INTO settlement_detail (
      id, run_id, conversion_id, impression_id, click_id, channel_id,
      amount, rate, commission, final_commission, attribution_trace, rate_snapshot, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const transaction = db.transaction((items: typeof details) => {
    for (const detail of items) {
      stmt.run(
        detail.id,
        detail.runId,
        detail.conversionId,
        detail.impressionId ?? null,
        detail.clickId ?? null,
        detail.channelId,
        detail.amount,
        detail.rate,
        detail.commission,
        detail.finalCommission,
        JSON.stringify(detail.attributionTrace),
        JSON.stringify(detail.rateSnapshot),
        now
      );
    }
  });
  transaction(details);
}

export function findDetailsByRunId(runId: string): SettlementDetail[] {
  const stmt = db.prepare('SELECT * FROM settlement_detail WHERE run_id = ? ORDER BY created_at');
  const rows = stmt.all(runId) as any[];
  const details: SettlementDetail[] = [];

  for (const row of rows) {
    const baseDetail = mapSettlementDetail(row);
    const deductions = findDeductionItemsByDetailId(row.id);
    details.push({
      ...baseDetail,
      deductions,
    });
  }

  return details;
}

export function bulkInsertDeductionItems(
  items: Array<Omit<DeductionItem, 'id'> & { detailId: string }>
): void {
  const stmt = db.prepare(`
    INSERT INTO deduction_item (
      id, detail_id, rule_id, rule_name, rule_version, amount, reason, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const transaction = db.transaction((itemList: typeof items) => {
    for (const item of itemList) {
      stmt.run(
        crypto.randomUUID(),
        item.detailId,
        item.ruleId,
        item.ruleName,
        item.ruleVersion,
        item.amount,
        item.reason,
        now
      );
    }
  });
  transaction(items);
}

export function findDeductionItemsByDetailId(detailId: string): DeductionItem[] {
  const stmt = db.prepare('SELECT * FROM deduction_item WHERE detail_id = ? ORDER BY created_at');
  const rows = stmt.all(detailId);
  return rows.map(mapDeductionItem);
}

export function findActiveRules(): DeductionRule[] {
  const stmt = db.prepare('SELECT * FROM deduction_rule WHERE is_active = 1 ORDER BY created_at DESC');
  const rows = stmt.all();
  return rows.map(mapDeductionRule);
}
