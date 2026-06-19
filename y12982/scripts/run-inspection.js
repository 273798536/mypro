const { get, run, all, generateId, recordAudit, closeDb } = require('../db');

async function runInspection(options = {}) {
  const operator = options.operator || 'system';
  const batchType = options.batch_type || 'daily_inspection';
  const remark = options.remark || '自动巡检批次';

  console.log('开始执行图数据库关系巡检...');
  console.log('  操作人:', operator);
  console.log('  批次类型:', batchType);

  const batchId = generateId('BATCH');
  const startTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

  await run(`
    INSERT INTO inspection_batches 
    (batch_id, batch_type, start_time, status, operator, remark)
    VALUES (?, ?, ?, 'running', ?, ?)
  `, [batchId, batchType, startTime, operator, remark]);

  console.log('  批次号:', batchId);

  const pendingQueries = await all("SELECT * FROM slow_queries WHERE status = 'pending'");

  console.log('  发现待处理慢查询:', pendingQueries.length, '条');

  let itemCount = 0;

  for (const q of pendingQueries) {
    const hasLockWait = q.lock_wait_time_ms > 3000;
    const isSlow = q.execution_time_ms > 5000;

    if (isSlow) {
      const itemId = generateId('ITEM');
      const title = `${q.query_type} 查询超时 - ${q.database_name || '未知库'}`;
      const desc = `执行时间 ${(q.execution_time_ms/1000).toFixed(2)}秒，` +
                   `扫描 ${q.rows_scanned?.toLocaleString() || '未知'} 行，` +
                   `返回 ${q.rows_returned || '未知'} 行`;
      await run(`
        INSERT INTO inspection_items 
        (item_id, batch_id, slow_query_id, item_type, title, description,
         severity, status)
        VALUES (?, ?, ?, 'slow_query', ?, ?, ?, 'pending')
      `, [itemId, batchId, q.id, title, desc, q.severity]);
      itemCount++;
    }

    if (hasLockWait) {
      const lockItemId = generateId('ITEM');
      const lockTitle = `锁等待过长 - ${q.query_type}`;
      const lockDesc = `锁等待时间 ${(q.lock_wait_time_ms/1000).toFixed(2)}秒，` +
                       `可能影响并发查询性能`;
      const severity = q.lock_wait_time_ms > 5000 ? 'critical' : 'warning';
      await run(`
        INSERT INTO inspection_items 
        (item_id, batch_id, slow_query_id, item_type, title, description,
         severity, status)
        VALUES (?, ?, ?, 'lock_wait', ?, ?, ?, 'pending')
      `, [lockItemId, batchId, q.id, lockTitle, lockDesc, severity]);
      itemCount++;
    }
  }

  const slowQueryCountRow = await get(`
    SELECT COUNT(DISTINCT slow_query_id) as cnt 
    FROM inspection_items 
    WHERE batch_id = ? AND slow_query_id IS NOT NULL
  `, [batchId]);

  const endTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await run(`
    UPDATE inspection_batches 
    SET status = 'completed', end_time = ?, slow_query_count = ?
    WHERE batch_id = ?
  `, [endTime, slowQueryCountRow.cnt, batchId]);

  await recordAudit(
    'create',
    'inspection_batch',
    batchId,
    null,
    'completed',
    operator,
    `自动巡检完成，生成 ${itemCount} 条巡检条目`,
    '127.0.0.1'
  );

  console.log('');
  console.log('巡检完成！');
  console.log('  批次号:', batchId);
  console.log('  开始时间:', startTime);
  console.log('  结束时间:', endTime);
  console.log('  生成巡检条目:', itemCount, '条');
  console.log('  关联慢查询:', slowQueryCountRow.cnt, '条');

  return { batch_id: batchId, item_count: itemCount, slow_query_count: slowQueryCountRow.cnt };
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const options = {};

    args.forEach(arg => {
      const [key, value] = arg.split('=');
      if (key && value) {
        const cleanKey = key.replace(/^--/, '');
        options[cleanKey] = value;
      }
    });

    await runInspection(options);
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  main();
}

module.exports = { runInspection };
