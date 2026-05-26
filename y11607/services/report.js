const { getDb } = require('../db');
const anomalyDetector = require('./anomalyDetector');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

function buildArbitrationReport() {
  const db = getDb();

  const cases = db.prepare('SELECT * FROM arbitration_cases ORDER BY created_at DESC').all();
  const allAnomalies = anomalyDetector.getAnomalies();
  const corrections = db.prepare('SELECT * FROM arbitration_corrections ORDER BY created_at DESC').all();
  const rollbackLogs = db.prepare('SELECT * FROM balance_rollback_log ORDER BY created_at DESC').all();

  const unhandled = [];
  const corrected = [];
  const needManual = [];

  for (const c of cases) {
    const caseAnomalies = allAnomalies.filter(a => a.case_no === c.case_no);
    const caseCorrections = corrections.filter(x => x.case_no === c.case_no);
    const caseRollbacks = rollbackLogs.filter(r => r.case_no === c.case_no);

    const unresolvedCount = caseAnomalies.filter(a => !a.resolved).length;

    const caseInfo = {
      case_no: c.case_no,
      merchant_id: c.merchant_id,
      order_no: c.order_no,
      status: c.status,
      current_handler: c.current_handler,
      complaint_detail: c.complaint_detail,
      arbitration_opinion: c.arbitration_opinion,
      created_at: c.created_at,
      updated_at: c.updated_at,
      anomaly_count: caseAnomalies.length,
      unresolved_anomaly_count: unresolvedCount,
      correction_count: caseCorrections.length,
      rollback_count: caseRollbacks.length,
      anomalies: caseAnomalies.map(a => ({
        type: a.anomaly_type,
        severity: a.severity,
        description: a.description,
        resolved: a.resolved === 1,
        extra_info: a.extra_info ? JSON.parse(a.extra_info) : null,
      })),
      corrections: caseCorrections.map(x => ({
        correction_type: x.correction_type,
        target_record: x.target_record,
        original_value: x.original_value,
        corrected_value: x.corrected_value,
        operator: x.operator,
        reason: x.reason,
        created_at: x.created_at,
      })),
      rollbacks: caseRollbacks.map(r => ({
        rollback_amount: r.rollback_amount,
        direction: r.direction,
        target_settle_date: r.target_settle_date,
        reason: r.reason,
        operator: r.operator,
        created_at: r.created_at,
      })),
    };

    if (c.status === 'resolved' || caseCorrections.length > 0) {
      corrected.push(caseInfo);
    } else if (caseAnomalies.length > 0 && unresolvedCount > 0) {
      const hasCritical = caseAnomalies.some(a => a.severity === 'critical' && !a.resolved);
      if (hasCritical && c.status !== 'investigating' && c.status !== 'pending_confirmation') {
        needManual.push(caseInfo);
      } else {
        unhandled.push(caseInfo);
      }
    } else {
      unhandled.push(caseInfo);
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total_cases: cases.length,
    unhandled_count: unhandled.length,
    corrected_count: corrected.length,
    need_manual_count: needManual.length,
    total_anomalies: allAnomalies.length,
    unresolved_anomalies: allAnomalies.filter(a => !a.resolved).length,
    total_corrections: corrections.length,
    total_rollbacks: rollbackLogs.length,
    rollback_amount_sum: rollbackLogs.reduce((s, r) => s + r.rollback_amount, 0),
  };

  return {
    summary,
    categories: {
      unhandled,
      corrected,
      need_manual_confirmation: needManual,
    },
  };
}

function exportCsv(report, outputDir) {
  const dir = outputDir || path.join(__dirname, '..', 'data', 'exports');
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const files = [];

  for (const [catName, items] of Object.entries(report.categories)) {
    if (items.length === 0) continue;

    const filename = `arbitration_${catName}_${timestamp}.csv`;
    const filePath = path.join(dir, filename);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'case_no', title: '工单编号' },
        { id: 'merchant_id', title: '商户ID' },
        { id: 'order_no', title: '订单号' },
        { id: 'status', title: '状态' },
        { id: 'current_handler', title: '处理人' },
        { id: 'complaint_detail', title: '投诉详情' },
        { id: 'arbitration_opinion', title: '仲裁意见' },
        { id: 'anomaly_count', title: '异常数' },
        { id: 'unresolved_anomaly_count', title: '未处理异常数' },
        { id: 'correction_count', title: '修正次数' },
        { id: 'rollback_count', title: '回滚次数' },
        { id: 'created_at', title: '创建时间' },
        { id: 'updated_at', title: '更新时间' },
      ],
    });

    csvWriter.writeRecords(items);
    files.push(filePath);
  }

  const summaryFile = path.join(dir, `arbitration_summary_${timestamp}.csv`);
  const summaryWriter = createCsvWriter({
    path: summaryFile,
    header: [
      { id: 'key', title: '指标' },
      { id: 'value', title: '数值' },
    ],
  });
  const summaryRows = Object.entries(report.summary).map(([k, v]) => ({ key: k, value: String(v) }));
  summaryWriter.writeRecords(summaryRows);
  files.push(summaryFile);

  return files;
}

function exportAnomaliesCsv(anomalies, outputDir) {
  const dir = outputDir || path.join(__dirname, '..', 'data', 'exports');
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `anomalies_${timestamp}.csv`;
  const filePath = path.join(dir, filename);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'id', title: 'ID' },
      { id: 'case_no', title: '关联工单' },
      { id: 'anomaly_type', title: '异常类型' },
      { id: 'severity', title: '严重程度' },
      { id: 'description', title: '描述' },
      { id: 'related_order', title: '关联订单' },
      { id: 'related_refund', title: '关联退款' },
      { id: 'related_subsidy', title: '关联补贴' },
      { id: 'resolved', title: '是否已处理' },
      { id: 'created_at', title: '创建时间' },
    ],
  });

  csvWriter.writeRecords(anomalies.map(a => ({
    ...a,
    resolved: a.resolved === 1 ? '是' : '否',
  })));

  return filePath;
}

module.exports = {
  buildArbitrationReport, exportCsv, exportAnomaliesCsv,
};
