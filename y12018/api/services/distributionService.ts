import { getDatabase } from '../db/index.ts';
import type { Distribution, BadRow, TiedRankGroup, DistributionDetail, CalculationStep, Deduction, Correction, Batch, CorrectionRequest, CorrectionWithDistribution } from '../../shared/types.ts';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getDistributions(
  eventId?: string,
  batchId?: string,
  status?: string,
  hasTiedRank?: boolean,
  hasDispute?: boolean,
  hasDuplicateResend?: boolean,
  page: number = 1,
  pageSize: number = 20
): { total: number; data: Distribution[]; bad_rows: BadRow[]; tied_rank_groups: TiedRankGroup[] } {
  const db = getDatabase();

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (eventId) {
    whereClauses.push('event_id = ?');
    params.push(eventId);
  }
  if (batchId) {
    whereClauses.push('batch_id = ?');
    params.push(batchId);
  }
  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }
  if (hasTiedRank === true) {
    whereClauses.push('is_tied = 1');
  }
  if (hasDispute === true) {
    whereClauses.push('has_dispute = 1');
  }
  if (hasDuplicateResend === true) {
    whereClauses.push('has_duplicate_resend = 1');
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM distributions ${whereSql}`);
  const totalResult = countStmt.get(...params) as { count: number };
  const total = totalResult.count;

  const offset = (page - 1) * pageSize;
  const dataStmt = db.prepare(`
    SELECT * FROM distributions ${whereSql}
    ORDER BY rank ASC, id ASC
    LIMIT ? OFFSET ?
  `);
  const data = dataStmt.all(...params, pageSize, offset) as Distribution[];

  const badRowsStmt = db.prepare(`
    SELECT * FROM bad_rows
    ${eventId ? 'WHERE event_id = ?' : ''}
    ORDER BY line_number ASC
  `);
  const bad_rows = badRowsStmt.all(...(eventId ? [eventId] : [])) as BadRow[];

  const tiedGroupsStmt = db.prepare(`
    SELECT * FROM tied_rank_groups
    ${eventId ? 'WHERE event_id = ?' : ''}
    ORDER BY rank ASC
  `);
  const tiedGroups = tiedGroupsStmt.all(...(eventId ? [eventId] : [])) as TiedRankGroup[];

  const tied_rank_groups = tiedGroups.map(group => {
    const playersStmt = db.prepare(`
      SELECT * FROM distributions WHERE tied_rank_group_id = ?
      ORDER BY id ASC
    `);
    const players = playersStmt.all(group.id) as Distribution[];
    return { ...group, players };
  });

  return { total, data, bad_rows, tied_rank_groups };
}

export function getDistributionDetail(id: string): DistributionDetail | null {
  const db = getDatabase();

  const distStmt = db.prepare('SELECT * FROM distributions WHERE id = ?');
  const distribution = distStmt.get(id) as Distribution | undefined;

  if (!distribution) {
    return null;
  }

  const deductionsStmt = db.prepare('SELECT * FROM deductions WHERE distribution_id = ?');
  const deductions = deductionsStmt.all(id) as Deduction[];

  const batchStmt = db.prepare('SELECT * FROM batches WHERE id = ?');
  const batch = batchStmt.get(distribution.batch_id) as Batch;

  const correctionsStmt = db.prepare('SELECT * FROM corrections WHERE distribution_id = ? ORDER BY created_at DESC');
  const corrections = correctionsStmt.all(id) as Correction[];

  const calculation_chain: CalculationStep[] = [
    { step: 1, label: '名次奖金基数', amount: distribution.gross_prize, description: `第${distribution.rank}名${distribution.is_tied ? '（并列）' : ''}` },
    { step: 2, label: '赞助/罚款扣款', amount: -distribution.total_deductions, description: deductions.map(d => d.description).join(', ') || '无' },
    { step: 3, label: '应纳税所得额', amount: distribution.taxable_amount, description: `奖金基数 - 扣款 = ${distribution.gross_prize} - ${distribution.total_deductions}` },
    { step: 4, label: '个税扣除', amount: -distribution.tax_amount, description: `税率 ${(distribution.tax_rate * 100).toFixed(0)}%` },
    { step: 5, label: '税后实发金额', amount: distribution.net_amount, description: '最终到账金额' },
  ];

  return {
    distribution,
    calculation_chain,
    deductions,
    batch,
    corrections,
  };
}

export function correctDistribution(
  id: string,
  request: CorrectionRequest
): { correction: Correction; distribution: Distribution } | null {
  const db = getDatabase();

  const distStmt = db.prepare('SELECT * FROM distributions WHERE id = ?');
  const distribution = distStmt.get(id) as Distribution | undefined;

  if (!distribution) {
    return null;
  }

  const oldValue = String(distribution[request.field as keyof Distribution]);

  const updateStmt = db.prepare(`
    UPDATE distributions
    SET ${request.field} = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  updateStmt.run(request.new_value, id);

  const correctionId = generateId();
  const insertStmt = db.prepare(`
    INSERT INTO corrections (id, distribution_id, field, old_value, new_value, reason, source_note, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(correctionId, id, request.field, oldValue, request.new_value, request.reason, request.source_note, 'finance');

  const newDistStmt = db.prepare('SELECT * FROM distributions WHERE id = ?');
  const newDistribution = newDistStmt.get(id) as Distribution;

  const correctionStmt = db.prepare('SELECT * FROM corrections WHERE id = ?');
  const correction = correctionStmt.get(correctionId) as Correction;

  return { correction, distribution: newDistribution };
}

export function getCorrections(
  batchId?: string,
  playerName?: string,
  operationType?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  pageSize: number = 20
): { total: number; data: CorrectionWithDistribution[] } {
  const db = getDatabase();

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (batchId) {
    whereClauses.push('d.batch_id = ?');
    params.push(batchId);
  }
  if (playerName) {
    whereClauses.push('d.player_name LIKE ?');
    params.push(`%${playerName}%`);
  }
  if (startDate) {
    whereClauses.push('c.created_at >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('c.created_at <= ?');
    params.push(endDate);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM corrections c
    JOIN distributions d ON c.distribution_id = d.id
    ${whereSql}
  `);
  const totalResult = countStmt.get(...params) as { count: number };
  const total = totalResult.count;

  const offset = (page - 1) * pageSize;
  const dataStmt = db.prepare(`
    SELECT c.*,
           d.id as dist_id, d.player_name, d.rank, d.event_id
    FROM corrections c
    JOIN distributions d ON c.distribution_id = d.id
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rawData = dataStmt.all(...params, pageSize, offset) as any[];

  const data = rawData.map(row => ({
    id: row.id,
    distribution_id: row.distribution_id,
    field: row.field,
    old_value: row.old_value,
    new_value: row.new_value,
    reason: row.reason,
    source_note: row.source_note,
    operator: row.operator,
    created_at: row.created_at,
    distribution: {
      id: row.dist_id,
      player_name: row.player_name,
      rank: row.rank,
      event_id: row.event_id,
    },
  })) as CorrectionWithDistribution[];

  return { total, data };
}

export function getExportCSV(
  includeBadRows: boolean = false,
  includeDisputes: boolean = true,
  eventId?: string
): string {
  const db = getDatabase();

  const distStmt = db.prepare(`
    SELECT * FROM distributions
    ${eventId ? 'WHERE event_id = ?' : ''}
    ORDER BY rank ASC
  `);
  const distributions = distStmt.all(...(eventId ? [eventId] : [])) as Distribution[];

  let csv = '选手姓名,名次,并列,奖金总额,扣款总额,应纳税额,税率,税额,税后金额,状态,银行卡尾号,有争议,重发过,来源\n';

  for (const d of distributions) {
    csv += `${d.player_name},${d.rank},${d.is_tied ? '是' : '否'},${d.gross_prize},${d.total_deductions},${d.taxable_amount},${(d.tax_rate * 100).toFixed(0)}%,${d.tax_amount},${d.net_amount},${getStatusText(d.status)},${d.bank_card_last4},${d.has_dispute ? '是' : '否'},${d.has_duplicate_resend ? '是' : '否'},"${d.source}"\n`;
  }

  if (includeBadRows) {
    csv += '\n--- 坏行记录 ---\n';
    csv += '行号,错误类型,错误描述,原始内容,来源\n';
    const badStmt = db.prepare(`
      SELECT * FROM bad_rows
      ${eventId ? 'WHERE event_id = ?' : ''}
      ORDER BY line_number ASC
    `);
    const badRows = badStmt.all(...(eventId ? [eventId] : [])) as BadRow[];
    for (const b of badRows) {
      csv += `${b.line_number},${getErrorTypeText(b.error_type)},${b.error_description},"${b.raw_line}","${b.source}"\n`;
    }
  }

  return csv;
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待发放',
    paid: '已发放',
    failed: '发放失败',
    disputed: '有争议',
  };
  return map[status] || status;
}

function getErrorTypeText(type: string): string {
  const map: Record<string, string> = {
    empty_row: '空行',
    missing_column: '缺列',
    format_error: '格式错误',
    invalid_deduction: '扣款无效',
    invalid_bank_receipt: '银行卡回执无效',
  };
  return map[type] || type;
}

export function getBatches(eventId?: string): Batch[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM batches
    ${eventId ? 'WHERE event_id = ?' : ''}
    ORDER BY created_at DESC
  `);
  return stmt.all(...(eventId ? [eventId] : [])) as Batch[];
}

export function getEvents(): { id: string; name: string }[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, name FROM events ORDER BY event_date DESC');
  return stmt.all() as { id: string; name: string }[];
}
