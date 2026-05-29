const { init, getDb } = require('./db');
const anomalyDetector = require('./services/anomalyDetector');

function seed() {
  init();
  const db = getDb();

  const tx = db.transaction(() => {
    db.exec('DELETE FROM anomalies');
    db.exec('DELETE FROM balance_rollback_log');
    db.exec('DELETE FROM settlement_reports');
    db.exec('DELETE FROM arbitration_corrections');
    db.exec('DELETE FROM arbitration_status_log');
    db.exec('DELETE FROM arbitration_cases');
    db.exec('DELETE FROM platform_subsidies');
    db.exec('DELETE FROM refund_records');
    db.exec('DELETE FROM merchant_orders');
    db.exec('DELETE FROM split_rules');

    const rules = [
      { rule_version: 'v1.0', merchant_id: 'M001', merchant_ratio: 0.70, platform_ratio: 0.30, effective_from: '2026-01-01', effective_to: '2026-03-31', status: 'active' },
      { rule_version: 'v2.0', merchant_id: 'M001', merchant_ratio: 0.75, platform_ratio: 0.25, effective_from: '2026-04-01', effective_to: null, status: 'active' },
      { rule_version: 'v1.0', merchant_id: 'M002', merchant_ratio: 0.65, platform_ratio: 0.35, effective_from: '2026-01-01', effective_to: null, status: 'active' },
      { rule_version: 'v1.0', merchant_id: 'M003', merchant_ratio: 0.80, platform_ratio: 0.20, effective_from: '2026-02-01', effective_to: null, status: 'active' },
    ];
    const ruleStmt = db.prepare(
      'INSERT INTO split_rules (rule_version, merchant_id, merchant_ratio, platform_ratio, effective_from, effective_to, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    rules.forEach(r => ruleStmt.run(r.rule_version, r.merchant_id, r.merchant_ratio, r.platform_ratio, r.effective_from, r.effective_to, r.status));

    const orders = [
      { order_no: 'ORD20260415001', merchant_id: 'M001', amount: 1000.00, settle_date: '2026-04-16', rule_version: 'v2.0', platform_subsidy: 50.00, subsidy_batch_no: 'SUB0416001' },
      { order_no: 'ORD20260415002', merchant_id: 'M001', amount: 2500.00, settle_date: '2026-04-16', rule_version: 'v2.0', platform_subsidy: 100.00, subsidy_batch_no: 'SUB0416001' },
      { order_no: 'ORD20260415003', merchant_id: 'M002', amount: 800.00, settle_date: '2026-04-16', rule_version: 'v1.0', platform_subsidy: 30.00, subsidy_batch_no: 'SUB0416002' },
      { order_no: 'ORD20260416001', merchant_id: 'M001', amount: 5000.00, settle_date: '2026-04-17', rule_version: 'v2.0', platform_subsidy: 200.00, subsidy_batch_no: 'SUB0417001' },
      { order_no: 'ORD20260417001', merchant_id: 'M003', amount: 300.00, settle_date: '2026-04-18', rule_version: 'v1.0', platform_subsidy: 15.00, subsidy_batch_no: 'SUB0418001' },
      { order_no: 'ORD20260320001', merchant_id: 'M001', amount: 1500.00, settle_date: '2026-03-21', rule_version: 'v1.0', platform_subsidy: 80.00, subsidy_batch_no: 'SUB0321001' },
      { order_no: 'ORD20260418001', merchant_id: 'M002', amount: 600.00, settle_date: '2026-04-19', rule_version: 'v1.0', platform_subsidy: 25.00, subsidy_batch_no: 'SUB0419001' },
    ];
    const orderStmt = db.prepare(
      'INSERT INTO merchant_orders (order_no, merchant_id, amount, settle_date, rule_version, platform_subsidy, subsidy_batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    orders.forEach(o => orderStmt.run(o.order_no, o.merchant_id, o.amount, o.settle_date, o.rule_version, o.platform_subsidy, o.subsidy_batch_no));

    const refunds = [
      { refund_no: 'RF20260418001', order_no: 'ORD20260415001', merchant_id: 'M001', refund_amount: 300.00, refund_date: '2026-04-18', settle_date: '2026-04-19' },
      { refund_no: 'RF20260419001', order_no: 'ORD20260320001', merchant_id: 'M001', refund_amount: 500.00, refund_date: '2026-04-19', settle_date: '2026-04-20' },
      { refund_no: 'RF20260420001', order_no: 'ORD20260416001', merchant_id: 'M001', refund_amount: 1000.00, refund_date: '2026-04-20', settle_date: '2026-04-21' },
    ];
    const refundStmt = db.prepare(
      'INSERT INTO refund_records (refund_no, order_no, merchant_id, refund_amount, refund_date, settle_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    refunds.forEach(r => refundStmt.run(r.refund_no, r.order_no, r.merchant_id, r.refund_amount, r.refund_date, r.settle_date));

    const subsidies = [
      { subsidy_batch_no: 'SUB0416001', order_no: 'ORD20260415001', merchant_id: 'M001', subsidy_amount: 50.00, granted_date: '2026-04-16', settle_date: '2026-04-16' },
      { subsidy_batch_no: 'SUB0416001', order_no: 'ORD20260415002', merchant_id: 'M001', subsidy_amount: 100.00, granted_date: '2026-04-16', settle_date: '2026-04-16' },
      { subsidy_batch_no: 'SUB0416002', order_no: 'ORD20260415003', merchant_id: 'M002', subsidy_amount: 30.00, granted_date: '2026-04-16', settle_date: '2026-04-16' },
      { subsidy_batch_no: 'SUB0417001', order_no: 'ORD20260416001', merchant_id: 'M001', subsidy_amount: 200.00, granted_date: '2026-04-17', settle_date: '2026-04-17' },
      { subsidy_batch_no: 'SUB0418001', order_no: 'ORD20260417001', merchant_id: 'M003', subsidy_amount: 15.00, granted_date: '2026-04-18', settle_date: '2026-04-18' },
      { subsidy_batch_no: 'SUB0416001', order_no: 'ORD20260415001', merchant_id: 'M001', subsidy_amount: 50.00, granted_date: '2026-04-17', settle_date: '2026-04-17' },
      { subsidy_batch_no: 'SUB0321001', order_no: 'ORD20260320001', merchant_id: 'M001', subsidy_amount: 80.00, granted_date: '2026-03-21', settle_date: '2026-03-21' },
      { subsidy_batch_no: 'SUB0419001', order_no: 'ORD20260418001', merchant_id: 'M002', subsidy_amount: 25.00, granted_date: '2026-04-19', settle_date: '2026-04-19' },
    ];
    const subStmt = db.prepare(
      'INSERT INTO platform_subsidies (subsidy_batch_no, order_no, merchant_id, subsidy_amount, granted_date, settle_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    subsidies.forEach(s => subStmt.run(s.subsidy_batch_no, s.order_no, s.merchant_id, s.subsidy_amount, s.granted_date, s.settle_date));

    const cases = [
      { case_no: 'ARB20260420001', merchant_id: 'M001', order_no: 'ORD20260415001', complaint_source: 'merchant_call', complaint_detail: '商户反映4月15日订单ORD20260415001退款300元后，分账结算金额异常，实际到账比预期少200元。', status: 'pending', current_handler: 'agent_zhang', arbitration_opinion: null },
      { case_no: 'ARB20260420002', merchant_id: 'M001', order_no: 'ORD20260320001', complaint_source: 'merchant_email', complaint_detail: '3月20日订单使用v1.0规则，但退款发生在4月，怀疑按v2.0规则执行了退款分账。', status: 'investigating', current_handler: 'agent_li', arbitration_opinion: '初步核对发现退款分账确实使用了v2.0比例(75%)，但订单原规则为v1.0(70%)，存在规则版本错配。' },
      { case_no: 'ARB20260421001', merchant_id: 'M001', order_no: 'ORD20260415002', complaint_source: 'system_alert', complaint_detail: '系统检测到补贴批次SUB0416001在ORD20260415001上重复入账。', status: 'pending', current_handler: null, arbitration_opinion: null },
    ];
    const caseStmt = db.prepare(
      'INSERT INTO arbitration_cases (case_no, merchant_id, order_no, complaint_source, complaint_detail, status, current_handler, arbitration_opinion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    cases.forEach(c => caseStmt.run(c.case_no, c.merchant_id, c.order_no, c.complaint_source, c.complaint_detail, c.status, c.current_handler, c.arbitration_opinion));

    const statusLogs = [
      { case_no: 'ARB20260420001', from_status: 'created', to_status: 'pending', operator: 'system', remark: '工单自动创建' },
      { case_no: 'ARB20260420002', from_status: 'created', to_status: 'pending', operator: 'system', remark: '工单自动创建' },
      { case_no: 'ARB20260420002', from_status: 'pending', to_status: 'investigating', operator: 'agent_li', remark: '开始调查' },
      { case_no: 'ARB20260421001', from_status: 'created', to_status: 'pending', operator: 'system', remark: '系统自动告警创建' },
    ];
    const logStmt = db.prepare(
      'INSERT INTO arbitration_status_log (case_no, from_status, to_status, operator, remark) VALUES (?, ?, ?, ?, ?)'
    );
    statusLogs.forEach(l => logStmt.run(l.case_no, l.from_status, l.to_status, l.operator, l.remark));

    const settlements = [
      { report_no: 'SR20260416M001', merchant_id: 'M001', settle_date: '2026-04-16', order_total: 3500.00, refund_total: 0, subsidy_total: 150.00, merchant_settlement: 2625.00, platform_income: 875.00, is_final: 1 },
      { report_no: 'SR20260416M002', merchant_id: 'M002', settle_date: '2026-04-16', order_total: 800.00, refund_total: 0, subsidy_total: 30.00, merchant_settlement: 520.00, platform_income: 280.00, is_final: 1 },
      { report_no: 'SR20260417M001', merchant_id: 'M001', settle_date: '2026-04-17', order_total: 5000.00, refund_total: 0, subsidy_total: 200.00, merchant_settlement: 3750.00, platform_income: 1250.00, is_final: 1 },
      { report_no: 'SR20260418M003', merchant_id: 'M003', settle_date: '2026-04-18', order_total: 300.00, refund_total: 0, subsidy_total: 15.00, merchant_settlement: 240.00, platform_income: 60.00, is_final: 1 },
      { report_no: 'SR20260321M001', merchant_id: 'M001', settle_date: '2026-03-21', order_total: 1500.00, refund_total: 0, subsidy_total: 80.00, merchant_settlement: 1050.00, platform_income: 450.00, is_final: 1 },
    ];
    const settleStmt = db.prepare(
      'INSERT INTO settlement_reports (report_no, merchant_id, settle_date, order_total, refund_total, subsidy_total, merchant_settlement, platform_income, is_final) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    settlements.forEach(s => settleStmt.run(s.report_no, s.merchant_id, s.settle_date, s.order_total, s.refund_total, s.subsidy_total, s.merchant_settlement, s.platform_income, s.is_final));
  });

  tx();

  const caseRows = db.prepare('SELECT case_no FROM arbitration_cases').all();
  let totalAnomalies = 0;
  for (const row of caseRows) {
    const anomalies = anomalyDetector.detectForCase(row.case_no);
    if (anomalies.length > 0) {
      totalAnomalies += anomalyDetector.saveAnomalies(row.case_no, anomalies);
    }
  }

  console.log('[SEED] 种子数据已写入，包含:');
  console.log('  - 4条分账规则（含v1.0/v2.0版本切换）');
  console.log('  - 7条商户订单（跨3月和4月）');
  console.log('  - 3条退款记录（含跨结算日退款、跨规则版本退款）');
  console.log('  - 8条平台补贴（含一条重复入账的SUB0416001）');
  console.log('  - 3条仲裁工单（2条pending、1条investigating）');
  console.log('  - 5条结算报告');
  console.log(`  - ${totalAnomalies}条异常记录（自动检测写入）`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
