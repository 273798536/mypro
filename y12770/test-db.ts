import { initDatabase, isDatabaseEmpty, db } from './api/db/database.js';
import { runSeed } from './api/db/seed.js';

initDatabase();
console.log('DB empty:', isDatabaseEmpty());
if (isDatabaseEmpty()) {
  runSeed();
}
const records = db.prepare('SELECT id, batch_no, status FROM weighing_records').all();
console.log('Records count:', records.length);
console.log('Records:', JSON.stringify(records, null, 2));
const logs = db.prepare('SELECT id, type, severity, actionable FROM trace_logs').all();
console.log('Trace logs count:', logs.length);
logs.forEach(l => console.log(' -', l.type, l.severity, ':', l.actionable));
