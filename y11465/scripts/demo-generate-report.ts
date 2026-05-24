import { getDb, initDb } from '../api/db/connection.js';
import { randomUUID } from 'crypto';

initDb();
const db = getDb();

console.log('=== 演示：生成品牌企划报告 ===\n');

const batch = db.prepare(`
  SELECT id, batch_no, style_code, brand, status, frozen, frozen_reason, frozen_at, created_by
  FROM batches 
  WHERE batch_no = ?
`).get('BATCH-2024-001') as any;

if (!batch) {
  console.log('未找到批次，请先运行 npm run seed');
  process.exit(1);
}

console.log('1. 准备报告数据...');

const documents = db.prepare(`
  SELECT id, document_type, document_no, version, status, created_by, created_at
  FROM documents 
  WHERE batch_id = ?
`).all(batch.id);

const tasks = db.prepare(`
  SELECT id, type, status, retry_count, error_message
  FROM tasks 
  WHERE batch_id = ?
`).all(batch.id);

const auditLogs = db.prepare(`
  SELECT id, action, reason, operated_by, created_at
  FROM audit_logs 
  WHERE entity_type = 'BATCH' AND entity_id = ?
  ORDER BY created_at DESC
`).all(batch.id);

const fabricTracks = db.prepare(`
  SELECT id, fabric_code, disposition, remark, recorded_by
  FROM fabric_tracks 
  WHERE style_code = ?
`).all(batch.style_code);

console.log('2. 冻结批次（模拟冻结场景）...');
db.prepare(`
  UPDATE batches 
  SET frozen = 1, frozen_reason = ?, frozen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run('数据存在异常，需要人工核实后再结算', batch.id);

console.log('3. 生成报告...');
const reportId = randomUUID();
const reportData = {
  batchInfo: {
    batchNo: batch.batch_no,
    styleCode: batch.style_code,
    brand: batch.brand,
    createdBy: batch.created_by,
    statusBefore: batch.status,
    statusAfter: 'FROZEN',
    frozenReason: '数据存在异常，需要人工核实后再结算',
    frozenAt: new Date().toISOString()
  },
  documents: {
    total: documents.length,
    byType: documents.reduce((acc: any, doc: any) => {
      acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
      return acc;
    }, {}),
    byStatus: documents.reduce((acc: any, doc: any) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {})
  },
  tasks: {
    total: tasks.length,
    byStatus: tasks.reduce((acc: any, task: any) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {}),
    waitingManual: tasks.filter((t: any) => t.status === 'WAITING_MANUAL').length,
    failed: tasks.filter((t: any) => t.status === 'PERMANENT_FAILED').length
  },
  fabricTracks: fabricTracks.map((ft: any) => ({
    fabricCode: ft.fabric_code,
    disposition: ft.disposition,
    remark: ft.remark,
    recordedBy: ft.recorded_by
  })),
  manualOperations: auditLogs.map((log: any) => ({
    action: log.action,
    reason: log.reason,
    operatedBy: log.operated_by,
    operatedAt: log.created_at
  })),
  summary: {
    issueCount: tasks.filter((t: any) => t.status !== 'SUCCESS').length,
    manualInterventionRequired: true,
    recommendation: '建议人工核实缺失信息后，补充完整再进行结算'
  }
};

db.prepare(`
  INSERT INTO reports (id, batch_id, type, data, generated_by)
  VALUES (?, ?, ?, ?, ?)
`).run(
  reportId,
  batch.id,
  'FREEZE',
  JSON.stringify(reportData),
  '品牌企划员'
);

console.log('4. 记录审计日志...');
const auditId = randomUUID();
db.prepare(`
  INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  auditId,
  'BATCH',
  batch.id,
  'FREEZE',
  JSON.stringify({ frozen: 0, status: batch.status }),
  JSON.stringify({ frozen: 1, status: 'FROZEN' }),
  '数据存在异常，需要人工核实后再结算',
  '品牌企划员'
);

console.log('\n=== 报告生成完成 ===');
console.log(`
  报告ID: ${reportId}
  报告类型: 冻结报告 (FREEZE)
  批次号: ${batch.batch_no}
  品牌: ${batch.brand}
  
  报告摘要：
  - 单据总数: ${documents.length} 份
  - 任务总数: ${tasks.length} 个
  - 需人工处理: ${tasks.filter((t: any) => t.status === 'WAITING_MANUAL').length} 个
  - 永久失败: ${tasks.filter((t: any) => t.status === 'PERMANENT_FAILED').length} 个
  - 面料去向记录: ${fabricTracks.length} 条
  - 人工操作记录: ${auditLogs.length} 条
  
  重点关注：
  1. 冻结前后状态对比：${batch.status} → FROZEN
  2. 冻结原因：数据存在异常，需要人工核实后再结算
  3. 人工操作理由：已完整记录在审计日志
  4. 导出汇总：支持导出Excel格式报告
  
  可以在报告中心查看完整报告详情
`);
