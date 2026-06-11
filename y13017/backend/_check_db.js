const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'dispute.db'));

console.log('=== 各表行数 ===');
console.log('disputes:', db.prepare('SELECT COUNT(*) as c FROM disputes').get().c);
console.log('emails:', db.prepare('SELECT COUNT(*) as c FROM emails').get().c);
console.log('attachments:', db.prepare('SELECT COUNT(*) as c FROM attachments').get().c);
console.log('timeline:', db.prepare('SELECT COUNT(*) as c FROM timeline').get().c);

console.log('\n=== disputes 详情 ===');
db.prepare('SELECT id, case_no, remark, is_manual_override FROM disputes ORDER BY case_no').all().forEach(r => {
  console.log(r);
});

console.log('\n=== attachments 按案件统计（真实关联数） ===');
db.prepare(`
  SELECT d.case_no,
         COUNT(a.id) as real_count,
         SUM(CASE WHEN a.is_late_arrival=1 THEN 1 ELSE 0 END) as real_late_count
  FROM disputes d
  LEFT JOIN attachments a ON d.id = a.dispute_id
  GROUP BY d.id
  ORDER BY d.case_no
`).all().forEach(r => {
  console.log(r);
});

console.log('\n=== attachments 全部明细 ===');
db.prepare(`
  SELECT d.case_no, a.id, a.file_name, a.is_late_arrival, a.arrival_batch_no, a.source_email_id
  FROM attachments a JOIN disputes d ON a.dispute_id=d.id
  ORDER BY d.case_no, a.id
`).all().forEach(r => {
  console.log(r);
});

console.log('\n=== emails 全部明细 ===');
db.prepare('SELECT id, subject, file_name, import_batch_no FROM emails ORDER BY imported_at').all().forEach(r => {
  console.log(r);
});

console.log('\n=== timeline event_type 统计（来源应一致对应） ===');
db.prepare(`
  SELECT event_type, COUNT(*) as c FROM timeline GROUP BY event_type ORDER BY event_type
`).all().forEach(r => console.log(r));
