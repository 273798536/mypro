import { getDatabase } from './index.ts';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function seedDatabase(): void {
  const db = getDatabase();

  const eventId = 'event_2026_championship';
  const batchId = 'batch_001';
  const tiedGroupId3rd = 'tied_group_3rd';
  const tiedGroupId5th = 'tied_group_5th';

  const eventCheck = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (eventCheck) {
    return;
  }

  db.prepare(`
    INSERT INTO events (id, name, description, event_date)
    VALUES (?, ?, ?, ?)
  `).run(eventId, '2026年度电竞锦标赛', '全国总决赛奖金发放', '2026-05-20');

  db.prepare(`
    INSERT INTO batches (id, event_id, status, total_count, paid_count, failed_count, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(batchId, eventId, 'partial_failed', 12, 9, 3, '2026-05-25 10:00:00', '2026-05-25 14:30:00');

  db.prepare(`
    INSERT INTO tied_rank_groups (id, event_id, rank)
    VALUES (?, ?, ?), (?, ?, ?)
  `).run(tiedGroupId3rd, eventId, 3, tiedGroupId5th, eventId, 5);

  const distributions = [
    {
      id: 'dist_001', player_name: '张志强', rank: 1, is_tied: 0,
      gross_prize: 50000, total_deductions: 0, taxable_amount: 50000,
      tax_rate: 0.20, tax_amount: 10000, net_amount: 40000,
      status: 'paid', bank_card_last4: '8821', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
    {
      id: 'dist_002', player_name: '李明远', rank: 2, is_tied: 0,
      gross_prize: 30000, total_deductions: 2000, taxable_amount: 28000,
      tax_rate: 0.20, tax_amount: 5600, net_amount: 22400,
      status: 'paid', bank_card_last4: '5543', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条 + 赞助扣款A'
    },
    {
      id: 'dist_003', player_name: '王浩宇', rank: 3, is_tied: 1, tied_rank_group_id: tiedGroupId3rd,
      gross_prize: 15000, total_deductions: 0, taxable_amount: 15000,
      tax_rate: 0.20, tax_amount: 3000, net_amount: 12000,
      status: 'paid', bank_card_last4: '2210', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条（并列第3）'
    },
    {
      id: 'dist_004', player_name: '陈思远', rank: 3, is_tied: 1, tied_rank_group_id: tiedGroupId3rd,
      gross_prize: 15000, total_deductions: 1500, taxable_amount: 13500,
      tax_rate: 0.20, tax_amount: 2700, net_amount: 10800,
      status: 'disputed', bank_card_last4: '3345', has_dispute: 1, has_duplicate_resend: 0,
      source: '赛事规则第3条 + 赞助扣款B（有争议）'
    },
    {
      id: 'dist_005', player_name: '刘天翔', rank: 5, is_tied: 1, tied_rank_group_id: tiedGroupId5th,
      gross_prize: 8000, total_deductions: 0, taxable_amount: 8000,
      tax_rate: 0.20, tax_amount: 1600, net_amount: 6400,
      status: 'failed', bank_card_last4: '7789', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条（并列第5）'
    },
    {
      id: 'dist_006', player_name: '赵文博', rank: 5, is_tied: 1, tied_rank_group_id: tiedGroupId5th,
      gross_prize: 8000, total_deductions: 500, taxable_amount: 7500,
      tax_rate: 0.20, tax_amount: 1500, net_amount: 6000,
      status: 'paid', bank_card_last4: '1123', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条 + 罚款'
    },
    {
      id: 'dist_007', player_name: '孙浩然', rank: 7, is_tied: 0,
      gross_prize: 5000, total_deductions: 0, taxable_amount: 5000,
      tax_rate: 0.20, tax_amount: 1000, net_amount: 4000,
      status: 'pending', bank_card_last4: '4456', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
    {
      id: 'dist_008', player_name: '周雨辰', rank: 8, is_tied: 0,
      gross_prize: 4000, total_deductions: 0, taxable_amount: 4000,
      tax_rate: 0.20, tax_amount: 800, net_amount: 3200,
      status: 'paid', bank_card_last4: '6678', has_dispute: 0, has_duplicate_resend: 1,
      source: '赛事规则第3条（重发）'
    },
    {
      id: 'dist_009', player_name: '吴俊杰', rank: 9, is_tied: 0,
      gross_prize: 3000, total_deductions: 0, taxable_amount: 3000,
      tax_rate: 0.20, tax_amount: 600, net_amount: 2400,
      status: 'failed', bank_card_last4: '9901', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
    {
      id: 'dist_010', player_name: '郑凯文', rank: 10, is_tied: 0,
      gross_prize: 2000, total_deductions: 0, taxable_amount: 2000,
      tax_rate: 0.20, tax_amount: 400, net_amount: 1600,
      status: 'paid', bank_card_last4: '2234', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
    {
      id: 'dist_011', player_name: '黄诗琪', rank: 11, is_tied: 0,
      gross_prize: 1500, total_deductions: 0, taxable_amount: 1500,
      tax_rate: 0.20, tax_amount: 300, net_amount: 1200,
      status: 'paid', bank_card_last4: '5567', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
    {
      id: 'dist_012', player_name: '林佳怡', rank: 12, is_tied: 0,
      gross_prize: 1000, total_deductions: 0, taxable_amount: 1000,
      tax_rate: 0.20, tax_amount: 200, net_amount: 800,
      status: 'paid', bank_card_last4: '8890', has_dispute: 0, has_duplicate_resend: 0,
      source: '赛事规则第3条'
    },
  ];

  const insertDist = db.prepare(`
    INSERT INTO distributions (
      id, event_id, batch_id, player_name, rank, is_tied, tied_rank_group_id,
      gross_prize, total_deductions, taxable_amount, tax_rate, tax_amount, net_amount,
      status, bank_card_last4, has_dispute, has_duplicate_resend, source,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = '2026-05-25 10:00:00';
  for (const d of distributions) {
    insertDist.run(
      d.id, eventId, batchId, d.player_name, d.rank, d.is_tied, d.tied_rank_group_id || null,
      d.gross_prize, d.total_deductions, d.taxable_amount, d.tax_rate, d.tax_amount, d.net_amount,
      d.status, d.bank_card_last4, d.has_dispute, d.has_duplicate_resend, d.source,
      now, now
    );
  }

  const deductions = [
    { id: 'ded_001', distribution_id: 'dist_002', type: 'sponsor', description: '赞助方A推广合作扣款', amount: 2000, source: '赞助协议第5款' },
    { id: 'ded_002', distribution_id: 'dist_004', type: 'sponsor', description: '赞助方B品牌合作扣款', amount: 1500, source: '赞助协议第7款（争议中）' },
    { id: 'ded_003', distribution_id: 'dist_006', type: 'penalty', description: '赛事违规罚款', amount: 500, source: '赛事纪律处罚单#2026-003' },
  ];

  const insertDed = db.prepare(`
    INSERT INTO deductions (id, distribution_id, type, description, amount, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const d of deductions) {
    insertDed.run(d.id, d.distribution_id, d.type, d.description, d.amount, d.source);
  }

  const badRows = [
    { id: 'bad_001', raw_line: '', line_number: 5, error_type: 'empty_row', error_description: '空行', source: '选手名单CSV' },
    { id: 'bad_002', raw_line: '杨帆,备注: 缺席颁奖', line_number: 8, error_type: 'missing_column', error_description: '缺少奖金和银行卡列', source: '选手名单CSV' },
    { id: 'bad_003', raw_line: '马超,13,ABC,5000,1234', line_number: 12, error_type: 'format_error', error_description: '奖金金额格式错误', source: '选手名单CSV' },
    { id: 'bad_004', raw_line: '徐磊,14,赞助扣款: 8000,2000,5678', line_number: 15, error_type: 'invalid_deduction', error_description: '扣款金额超过奖金总额', source: '赞助扣款明细' },
    { id: 'bad_005', raw_line: '冯晨,15,0,1500,XXXX', line_number: 18, error_type: 'invalid_bank_receipt', error_description: '银行卡号无效', source: '银行卡回执' },
  ];

  const insertBad = db.prepare(`
    INSERT INTO bad_rows (id, event_id, raw_line, line_number, error_type, error_description, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of badRows) {
    insertBad.run(b.id, eventId, b.raw_line, b.line_number, b.error_type, b.error_description, b.source, now);
  }

  db.prepare(`
    INSERT INTO corrections (id, distribution_id, field, old_value, new_value, reason, source_note, operator, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'corr_001', 'dist_008', 'status', 'failed', 'paid',
    '银行卡号更正后重发成功', '银行回执#2026-0589', '财务-张姐',
    '2026-05-26 09:30:00'
  );
}
