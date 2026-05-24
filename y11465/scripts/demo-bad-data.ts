import { getDb, initDb } from '../api/db/connection.js';
import { randomUUID } from 'crypto';

initDb();
const db = getDb();

console.log('=== 演示：触发坏数据场景 ===\n');

const badBatchId = randomUUID();

console.log('1. 创建包含不完整数据的批次（模拟司机只拍了半张单）...');
db.prepare(`
  INSERT INTO batches (id, batch_no, style_code, brand, status, duplicate_strategy, frozen, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  badBatchId,
  'BATCH-BAD-001',
  'STYLE-ERROR-001',
  '测试品牌',
  'PENDING_REVIEW',
  'IGNORE',
  0,
  '演示用户'
);

console.log('2. 创建缺失关键字段的样衣流转单（模拟半张单）...');
const badDocId = randomUUID();
db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  badDocId,
  badBatchId,
  'SAMPLE_FLOW',
  'FLOW-BAD-001',
  'STYLE-ERROR-001',
  1,
  JSON.stringify({
    sampleName: '不完整的样衣单',
    sendDate: '2024-01-20',
    items: [
      { size: 'S', quantity: 2 }
    ],
    remark: '这张单只有半张，缺少接收日期和接收人信息'
  }),
  'PENDING_REVIEW',
  '演示用户'
);

console.log('3. 创建一个会失败的异步任务（模拟数据验证失败）...');
const badTaskId = randomUUID();
db.prepare(`
  INSERT INTO tasks (id, batch_id, document_id, type, status, retry_count, max_retries, payload, error_message, error_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  badTaskId,
  badBatchId,
  badDocId,
  'DOCUMENT_VALIDATION',
  'WAITING_MANUAL',
  3,
  3,
  JSON.stringify({ step: 'validate_fields', document: 'FLOW-BAD-001' }),
  '缺少必填字段：receiveDate, receiver，无法完成自动验证',
  'MISSING_REQUIRED_FIELDS'
);

console.log('4. 记录审计日志...');
const auditId = randomUUID();
db.prepare(`
  INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  auditId,
  'DOCUMENT',
  badDocId,
  'CREATE',
  null,
  JSON.stringify({ documentNo: 'FLOW-BAD-001', status: 'PENDING_REVIEW' }),
  '上传不完整的样衣流转单（模拟司机只拍了半张单）',
  '演示用户'
);

console.log('\n=== 坏数据场景创建完成 ===');
console.log(`
  批次号: BATCH-BAD-001
  单据号: FLOW-BAD-001
  任务ID: ${badTaskId}
  
  问题描述：
  - 样衣流转单缺少必填字段（接收日期、接收人）
  - 异步任务验证失败，状态为"等人工"
  - 可以在任务监控页面查看并处理此任务
`);
