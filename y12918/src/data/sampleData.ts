import { run, get } from '../database';

const SAMPLE_FLAG_KEY = 'sample_data_loaded';

export function isSampleDataLoaded(): boolean {
  const row = get(
    'SELECT value FROM system_settings WHERE key = ?',
    [SAMPLE_FLAG_KEY]
  ) as { value: string } | undefined;
  return row?.value === 'true';
}

export function markSampleDataLoaded(): void {
  run(
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [SAMPLE_FLAG_KEY, 'true']
  );
}

export function loadSampleData(): void {
  if (isSampleDataLoaded()) {
    return;
  }

  const vocabResult = run(
    `INSERT INTO domain_vocabularies (name, domain, total_terms)
     VALUES (?, ?, ?)`,
    ['金融领域词表V2.1', '金融', 15]
  );

  const vocabularyId = vocabResult.lastInsertRowid;

  const terms: [string, string][] = [
    ['市盈率', '估值指标'],
    ['市净率', '估值指标'],
    ['净资产收益率', '盈利能力'],
    ['毛利率', '盈利能力'],
    ['资产负债率', '偿债能力'],
    ['流动比率', '偿债能力'],
    ['净利润', '利润指标'],
    ['营业收入', '收入指标'],
    ['现金流', '现金流'],
    ['股息率', '分红指标'],
    ['每股收益', '每股指标'],
    ['每股净资产', '每股指标'],
    ['应收账款', '资产项'],
    ['存货', '资产项'],
    ['固定资产', '资产项'],
  ];

  terms.forEach(([term, category]) => {
    run(
      'INSERT INTO vocabulary_terms (vocabulary_id, term, category) VALUES (?, ?, ?)',
      [vocabularyId, term, category]
    );
  });

  const evalSetResult = run(
    `INSERT INTO evaluation_sets (name, description, source, total_questions)
     VALUES (?, ?, ?, ?)`,
    ['2024Q1金融评测集', '第一季度金融领域评测题库', '内部题库', 8]
  );

  const evaluationSetId = evalSetResult.lastInsertRowid;

  const questions = [
    { qid: 'FIN-001', text: '请计算该公司的市盈率和市净率，并分析其估值水平。', status: 'full', tags: '市盈率,市净率' },
    { qid: 'FIN-002', text: '分析公司净资产收益率变化趋势，与行业平均水平对比。', status: 'full', tags: '净资产收益率' },
    { qid: 'FIN-003', text: '简述毛利率与净利率的区别及各自的经济含义。', status: 'partial', tags: '毛利率' },
    { qid: 'FIN-004', text: '资产负债率过高对企业经营有哪些风险？', status: 'full', tags: '资产负债率' },
    { qid: 'FIN-005', text: '流动比率和速动比率的计算公式是什么？', status: 'full', tags: '流动比率' },
    { qid: 'FIN-006', text: '请分析公司净利润同比下滑的可能原因。', status: 'full', tags: '净利润' },
    { qid: 'FIN-007', text: '营业收入确认原则有哪些？请举例说明。', status: 'none', tags: '' },
    { qid: 'FIN-008', text: '现金流折现模型的基本假设是什么？', status: 'none', tags: '' },
  ];

  questions.forEach((q) => {
    run(
      `INSERT INTO questions (evaluation_set_id, question_id, question_text, domain_tags, annotation_status)
       VALUES (?, ?, ?, ?, ?)`,
      [evaluationSetId, q.qid, q.text, q.tags, q.status]
    );
  });

  const reportResult = run(
    `INSERT INTO coverage_reports
     (name, evaluation_set_id, vocabulary_id, status, total_questions, covered_questions,
      coverage_rate, total_terms, hit_terms, summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '2024Q1金融领域词表覆盖报告',
      evaluationSetId,
      vocabularyId,
      'pending_review',
      8,
      6,
      75.0,
      15,
      8,
      '示例报告：评测集共8题，其中6题命中词表，覆盖率75%。尚有2题未完成标注，需复核确认。',
      '系统示例',
    ]
  );

  const reportId = reportResult.lastInsertRowid;

  const reportItems = [
    { qid: 'FIN-001', text: '请计算该公司的市盈率和市净率，并分析其估值水平。', covered: 1, hits: '["市盈率","市净率"]', status: 'full' },
    { qid: 'FIN-002', text: '分析公司净资产收益率变化趋势，与行业平均水平对比。', covered: 1, hits: '["净资产收益率"]', status: 'full' },
    { qid: 'FIN-003', text: '简述毛利率与净利率的区别及各自的经济含义。', covered: 1, hits: '["毛利率"]', status: 'partial' },
    { qid: 'FIN-004', text: '资产负债率过高对企业经营有哪些风险？', covered: 1, hits: '["资产负债率"]', status: 'full' },
    { qid: 'FIN-005', text: '流动比率和速动比率的计算公式是什么？', covered: 1, hits: '["流动比率"]', status: 'full' },
    { qid: 'FIN-006', text: '请分析公司净利润同比下滑的可能原因。', covered: 1, hits: '["净利润"]', status: 'full' },
    { qid: 'FIN-007', text: '营业收入确认原则有哪些？请举例说明。', covered: 0, hits: '[]', status: 'none' },
    { qid: 'FIN-008', text: '现金流折现模型的基本假设是什么？', covered: 0, hits: '[]', status: 'none' },
  ];

  reportItems.forEach((item) => {
    run(
      `INSERT INTO report_items
       (report_id, question_id, question_text, is_covered, hit_terms, annotation_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        item.qid,
        item.text,
        item.covered,
        item.hits,
        item.status,
      ]
    );
  });

  markSampleDataLoaded();
}
