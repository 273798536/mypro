import { getDb, initDb } from '../api/db/connection.js';
import { randomUUID } from 'crypto';

initDb();
const db = getDb();

console.log('=== 演示：人工修正坏数据 ===\n');

const badDoc = db.prepare(`
  SELECT id, batch_id, data FROM documents WHERE document_no = ?
`).get('FLOW-BAD-001') as any;

if (!badDoc) {
  console.log('未找到坏数据，请先运行 npm run demo:bad-data');
  process.exit(1);
}

const oldData = JSON.parse(badDoc.data);

console.log('1. 找到问题单据:', 'FLOW-BAD-001');
console.log('   原始数据:', JSON.stringify(oldData, null, 2).slice(0, 200) + '...');

console.log('\n2. 人工补全缺失的字段...');
const newData = {
  ...oldData,
  receiveDate: '2024-01-22',
  receiver: '张质检',
  items: oldData.items.map((item: any) => ({
    ...item,
    color: item.color || '未标注'
  }))
};

db.prepare(`
  UPDATE documents 
  SET data = ?, version = version + 1, status = 'MODIFIED', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(JSON.stringify(newData), badDoc.id);

console.log('3. 记录面料去向追踪...');
const fabricTrackId = randomUUID();
db.prepare(`
  INSERT INTO fabric_tracks (id, document_id, style_code, old_version, new_version, fabric_code, disposition, remark, recorded_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  fabricTrackId,
  badDoc.id,
  'STYLE-ERROR-001',
  1,
  2,
  'FAB-DEFAULT-001',
  'REUSE',
  '人工补全信息后，面料继续留用',
  '人工修正员'
);

console.log('4. 更新任务状态为成功...');
const task = db.prepare(`
  SELECT id FROM tasks WHERE document_id = ?
`).get(badDoc.id) as any;

if (task) {
  db.prepare(`
    UPDATE tasks 
    SET status = 'SUCCESS', error_message = NULL, error_type = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(task.id);
}

console.log('5. 记录审计日志（修正前后对比）...');
const auditId = randomUUID();
db.prepare(`
  INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  auditId,
  'DOCUMENT',
  badDoc.id,
  'MANUAL_FIX',
  JSON.stringify({ version: 1, data: oldData }),
  JSON.stringify({ version: 2, data: newData }),
  '人工补全缺失的接收日期和接收人信息',
  '人工修正员'
);

console.log('\n=== 人工修正完成 ===');
console.log(`
  修正内容：
  - 补充接收日期: 2024-01-22
  - 补充接收人: 张质检
  - 版本升级: v1 → v2
  
  相关记录：
  - 面料去向追踪: 留用 (REUSE)
  - 任务状态: 已更新为成功
  - 审计日志: 已记录修正前后差异
  
  可以在以下页面查看结果：
  - 单据详情页：查看版本对比差异
  - 审计追踪页：查看完整的操作历史
  - 面料追踪：查看旧版面料的去向记录
`);
