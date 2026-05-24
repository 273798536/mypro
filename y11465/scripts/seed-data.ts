import { getDb, initDb } from '../api/db/connection.js';
import { randomUUID } from 'crypto';

initDb();
const db = getDb();

console.log('开始导入示例数据...');

const batchId1 = randomUUID();
const batchId2 = randomUUID();

db.prepare(`
  INSERT INTO batches (id, batch_no, style_code, brand, status, duplicate_strategy, frozen, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  batchId1,
  'BATCH-2024-001',
  'STYLE-A001',
  '品牌A',
  'PENDING_REVIEW',
  'IGNORE',
  0,
  '张三'
);

db.prepare(`
  INSERT INTO batches (id, batch_no, style_code, brand, status, duplicate_strategy, frozen, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  batchId2,
  'BATCH-2024-002',
  'STYLE-B002',
  '品牌B',
  'DRAFT',
  'OVERWRITE',
  0,
  '李四'
);

const doc1Id = randomUUID();
const doc2Id = randomUUID();
const doc3Id = randomUUID();
const doc4Id = randomUUID();
const doc5Id = randomUUID();

db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  doc1Id,
  batchId1,
  'SAMPLE_FLOW',
  'FLOW-2024-001',
  'STYLE-A001',
  1,
  JSON.stringify({
    sampleName: '春季新款连衣裙',
    sampleType: '打版样',
    sendDate: '2024-01-15',
    receiveDate: '2024-01-20',
    sender: '王师傅',
    receiver: '李质检',
    items: [
      { size: 'S', color: '红色', quantity: 2 },
      { size: 'M', color: '红色', quantity: 3 }
    ],
    remark: '初次打版，请注意领口尺寸'
  }),
  'PENDING_REVIEW',
  '张三'
);

db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  doc2Id,
  batchId1,
  'SIZE_MODIFY',
  'SIZE-2024-001',
  'STYLE-A001',
  2,
  JSON.stringify({
    modifyType: '尺寸调整',
    originalSize: { bust: 90, waist: 70, hip: 95 },
    newSize: { bust: 92, waist: 72, hip: 97 },
    modifyReason: '客户反馈偏小，需要放大一码',
    parts: ['胸围', '腰围', '臀围'],
    priority: '高'
  }),
  'PENDING_REVIEW',
  '张三'
);

db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  doc3Id,
  batchId1,
  'FABRIC_STOCK',
  'FABRIC-2024-001',
  'STYLE-A001',
  1,
  JSON.stringify({
    fabricCode: 'FAB-COTTON-001',
    fabricName: '纯棉平纹布',
    color: '深红色',
    inQuantity: 50,
    outQuantity: 30,
    unit: '米',
    warehouse: 'A仓-01位',
    operator: '仓管员A'
  }),
  'APPROVED',
  '王五'
);

db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by, review_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  doc4Id,
  batchId2,
  'SUPPLEMENT',
  'SUPP-2024-001',
  'STYLE-B002',
  1,
  JSON.stringify({
    supplementType: '缺失信息补录',
    missingFields: ['面料供应商', '采购价格'],
    supplementContent: {
      supplier: 'XX面料有限公司',
      price: 45.5
    },
    remark: '司机只拍了半张单，缺失部分信息'
  }),
  'PENDING_REVIEW',
  '李四',
  null
);

db.prepare(`
  INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  doc5Id,
  batchId2,
  'SHIFT_RECORD',
  'SHIFT-2024-001',
  'STYLE-B002',
  1,
  JSON.stringify({
    shiftDate: '2024-01-18',
    shiftType: '白班',
    workers: ['工人A', '工人B', '工人C'],
    workContent: '打版裁剪',
    output: 15,
    qualityPass: 14,
    qualityRate: 0.933
  }),
  'DRAFT',
  '赵六'
);

const task1Id = randomUUID();
const task2Id = randomUUID();
const task3Id = randomUUID();

db.prepare(`
  INSERT INTO tasks (id, batch_id, document_id, type, status, retry_count, max_retries, payload)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  task1Id,
  batchId1,
  doc1Id,
  'DOCUMENT_VALIDATION',
  'WAITING_RETRY',
  1,
  3,
  JSON.stringify({ step: 'validate', documentNo: 'FLOW-2024-001' })
);

db.prepare(`
  INSERT INTO tasks (id, batch_id, document_id, type, status, retry_count, max_retries, payload, error_message, error_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  task2Id,
  batchId1,
  doc2Id,
  'DATA_SYNC',
  'WAITING_MANUAL',
  3,
  3,
  JSON.stringify({ step: 'sync', target: 'ERP' }),
  'ERP系统接口返回500错误，数据格式不兼容',
  'API_ERROR'
);

db.prepare(`
  INSERT INTO tasks (id, batch_id, document_id, type, status, retry_count, max_retries, payload, error_message, error_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  task3Id,
  batchId2,
  doc4Id,
  'DOCUMENT_VALIDATION',
  'PERMANENT_FAILED',
  3,
  3,
  JSON.stringify({ step: 'validate' }),
  '单据数据严重缺失，无法自动修复，请人工处理',
  'VALIDATION_ERROR'
);

const audit1Id = randomUUID();
const audit2Id = randomUUID();

db.prepare(`
  INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  audit1Id,
  'DOCUMENT',
  doc2Id,
  'UPDATE',
  JSON.stringify({ version: 1, status: 'DRAFT' }),
  JSON.stringify({ version: 2, status: 'PENDING_REVIEW' }),
  '根据客户反馈更新尺码数据',
  '张三'
);

db.prepare(`
  INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  audit2Id,
  'BATCH',
  batchId1,
  'SUBMIT',
  JSON.stringify({ status: 'DRAFT' }),
  JSON.stringify({ status: 'PENDING_REVIEW' }),
  '提交批次进入复核流程',
  '张三'
);

const fabricTrackId = randomUUID();
db.prepare(`
  INSERT INTO fabric_tracks (id, document_id, style_code, old_version, new_version, fabric_code, disposition, remark, recorded_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  fabricTrackId,
  doc2Id,
  'STYLE-A001',
  1,
  2,
  'FAB-COTTON-001',
  'RETURN',
  '旧版面料退回仓库，等待重新领用新版面料',
  '仓管员A'
);

console.log('示例数据导入完成！');
console.log(`
  批次数据: 2 条
  单据数据: 5 条
  任务数据: 3 条
  审计日志: 2 条
  面料追踪: 1 条
`);
