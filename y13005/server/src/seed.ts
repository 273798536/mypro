import { db, initSchema } from './db';

initSchema();

const insertBatch = db.prepare(`
  INSERT INTO batches (batch_no, batch_name, abs_name, payment_date, status, total_amount, reviewer)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertReceipt = db.prepare(`
  INSERT INTO receipts (batch_id, receipt_no, raw_data, trustee_name, payer, amount, currency, expected_currency, receipt_date, remark, is_currency_anomaly, source_file)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReview = db.prepare(`
  INSERT INTO review_records (receipt_id, batch_id, reviewer, initial_conclusion, manual_conclusion, is_manual_override, override_reason, override_impact, status, needs_material, supplementary_material, review_guidance)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertHistory = db.prepare(`
  INSERT INTO review_history (review_record_id, receipt_id, version, old_conclusion, new_conclusion, old_status, new_status, change_reason, changed_by, supplementary_material_added, new_note, snapshot_before, snapshot_after)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAnomaly = db.prepare(`
  INSERT INTO currency_anomalies (receipt_id, batch_id, detected_currency, expected_currency, amount, description, resolved)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction(() => {
  const batch1 = insertBatch.run(
    'ABS-2026-0601',
    '2026年6月第一期本息兑付',
    '某某租赁2025-1号资产支持专项计划',
    '2026-06-08',
    'reviewing',
    12580000,
    '小林'
  ).lastInsertRowid as number;

  const batch2 = insertBatch.run(
    'ABS-2026-0602',
    '2026年6月第二期本息兑付',
    '某某小贷2024-3号资产支持专项计划',
    '2026-06-15',
    'pending',
    8920000,
    null
  ).lastInsertRowid as number;

  const receipt1Raw = JSON.stringify({
    托管回执编号: 'TG-2026-0608-001',
    受托人: '中信证券托管部',
    付款方: '某某租赁有限公司',
    金额: '5,000,000.00',
    币种: 'CNY',
    到账日期: '2026-06-08',
    备注: '优先级A本金',
    旧口径字段: '2024年之前沿用的备注方式'
  });
  const r1 = insertReceipt.run(
    batch1, 'TG-2026-0608-001', receipt1Raw,
    '中信证券托管部', '某某租赁有限公司', 5000000, 'CNY', 'CNY',
    '2026-06-08', '优先级A本金', 0, '托管回执扫描件_001.pdf'
  ).lastInsertRowid as number;

  const receipt2Raw = JSON.stringify({
    托管回单编号: 'TG-2026-0608-002',
    受托人名称: '中信证券',
    付款人全称: '某某租赁',
    金额: 3200000,
    币别: 'USD',
    到账日: '2026-06-08',
    备注栏: '利息款',
    手工附加: '项目经理说这笔其实是人民币,可能录错了'
  });
  const r2 = insertReceipt.run(
    batch1, 'TG-2026-0608-002', receipt2Raw,
    '中信证券', '某某租赁', 3200000, 'USD', 'CNY',
    '2026-06-08', '利息款', 1, '托管回执扫描件_002.pdf'
  ).lastInsertRowid as number;

  insertAnomaly.run(
    r2, batch1, 'USD', 'CNY', 3200000,
    '托管回执中币别显示为USD，但专项计划本位币为CNY，疑似录入错误，已单独隔离',
    0
  );

  const receipt3Raw = JSON.stringify({
    回执号: 'TG-2026-0608-003',
    托管人: '中信证券托管',
    付款单位: '某某租赁有限公司',
    金额大写: '肆佰叁拾捌万元整',
    金额: '4,380,000.00',
    币种: '人民币',
    日期: '2026-06-08',
    摘要: '优先级B本金及利息',
    可疑字段: '金额大写与数字不一致,大写写肆佰叁拾捌万,数字为4,380,000'
  });
  const r3 = insertReceipt.run(
    batch1, 'TG-2026-0608-003', receipt3Raw,
    '中信证券托管', '某某租赁有限公司', 4380000, 'CNY', 'CNY',
    '2026-06-08', '优先级B本金及利息', 0, '托管回执扫描件_003.pdf'
  ).lastInsertRowid as number;

  const rr1 = insertReview.run(
    r1, batch1, '小林',
    '通过-金额与预期一致',
    '通过-金额与预期一致',
    0, null, null, 'pass',
    null, null, '该条回执数据完整，金额与预期兑付表一致，可直接放行'
  ).lastInsertRowid as number;

  const rr2 = insertReview.run(
    r3, batch1, '小林',
    '存疑-金额大小写不一致',
    '通过-经核实大写为笔误',
    1,
    '与托管行电话核实，回执扫描件上大写"肆佰叁拾捌万"实为手写笔误，小写4,380,000正确，银行流水显示到账金额无误',
    '改判影响：原系统判定存疑，复核后确认放行。该笔为优先级B本金及利息组成部分，放行后不影响批次整体结论',
    'pass',
    null,
    '托管行电话沟通记录截图_20260609.png',
    '该条需核实金额一致性，已通过电话核实，保留沟通凭证后放行'
  ).lastInsertRowid as number;

  insertHistory.run(
    rr2, r3, 1,
    null, '存疑-金额大小写不一致',
    null, 'pending',
    '系统自动初判：金额大小写字段存在差异',
    'system', null, null,
    null,
    JSON.stringify({ conclusion: '存疑-金额大小写不一致', status: 'pending' })
  );
  insertHistory.run(
    rr2, r3, 2,
    '存疑-金额大小写不一致', '通过-经核实大写为笔误',
    'pending', 'pass',
    '与托管行电话核实，回执扫描件上大写"肆佰叁拾捌万"实为手写笔误，小写4,380,000正确，银行流水显示到账金额无误',
    '小林',
    '托管行电话沟通记录截图_20260609.png',
    '复核人补充了核实说明和凭证，原存疑点已消除',
    JSON.stringify({ conclusion: '存疑-金额大小写不一致', status: 'pending' }),
    JSON.stringify({ conclusion: '通过-经核实大写为笔误', status: 'pass', manualOverride: true })
  );

  const r4 = insertReceipt.run(
    batch2, 'TG-2026-0615-001',
    JSON.stringify({ 回执号: 'TG-2026-0615-001', 金额: '待确认', 备注: '托管行回执尚未完全到位' }),
    '国泰君安托管', null, null, null, 'CNY', null, null, 0, '待补'
  ).lastInsertRowid as number;
  insertReview.run(
    r4, batch2, null, '待补材料-回执缺失', null, 0, null, null, 'pending',
    '托管行正式回执、到账银行流水单', null, '材料缺失，需先补托管回执和银行流水再继续复核'
  );
});

tx();
console.log('种子数据已写入完成 ✅');
