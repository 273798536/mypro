const { get, run, closeDb } = require('../db');

async function seedData() {
  const userCount = (await get('SELECT COUNT(*) as cnt FROM users')).cnt;
  if (userCount > 0) {
    console.log('数据库已有数据，跳过植入');
    return;
  }

  const users = [
    ['zhangwei', '张伟', 'warehouse_engineer'],
    ['liming', '李明', 'warehouse_engineer'],
    ['wangfang', '王芳', 'auditor'],
    ['zhaojun', '赵军', 'admin']
  ];
  for (const u of users) {
    await run('INSERT INTO users (username, real_name, role) VALUES (?, ?, ?)', u);
  }

  const now = new Date();
  const batchDate = now.toISOString().split('T')[0];

  const batches = [
    [
      'BATCH-' + batchDate + '-001',
      'daily_inspection',
      '2026-06-19 02:00:00',
      '2026-06-19 02:15:30',
      'completed',
      12,
      8,
      8,
      'zhangwei',
      '日常巡检 - 图数据库关系查询性能检查'
    ],
    [
      'BATCH-' + batchDate + '-002',
      'backup_verification',
      '2026-06-19 03:00:00',
      '2026-06-19 03:45:00',
      'completed',
      5,
      6,
      6,
      'liming',
      '备份校验 + 慢查询归因联合批次'
    ]
  ];
  for (const b of batches) {
    await run(`
      INSERT INTO inspection_batches 
      (batch_id, batch_type, start_time, end_time, status, slow_query_count, 
       backup_verified, backup_total, operator, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, b);
  }

  const slowQueries = [
    [
      'SQ-20260619-001',
      'MATCH (a:Warehouse)-[:HAS_SHELF]->(s:Shelf)-[:STOCKS]->(p:Product) WHERE a.region = "华东" RETURN count(p)',
      'cypher_read',
      8500,
      2300,
      1250000,
      1,
      '2026-06-19 01:23:45',
      'warehouse_graph',
      '192.168.1.105',
      'report_user',
      'critical',
      'resolved',
      'BATCH-' + batchDate + '-001'
    ],
    [
      'SQ-20260619-002',
      'MATCH path = (start:Inventory {id: "INV-8823"})-[*..5]->(end:Location) RETURN path',
      'cypher_path',
      12000,
      5600,
      3200000,
      47,
      '2026-06-19 02:05:12',
      'warehouse_graph',
      '192.168.1.203',
      'batch_job',
      'critical',
      'resolved',
      'BATCH-' + batchDate + '-001'
    ],
    [
      'SQ-20260619-003',
      'MATCH (n:Order) WHERE n.status = "pending" SET n.status = "processing" RETURN count(n)',
      'cypher_write',
      6200,
      4100,
      850000,
      1280,
      '2026-06-19 02:30:00',
      'order_graph',
      '192.168.1.150',
      'order_service',
      'warning',
      'pending',
      'BATCH-' + batchDate + '-001'
    ],
    [
      'SQ-20260619-004',
      'MATCH (a:Supplier)-[:SUPPLIES]->(p:Product) RETURN a.name, count(p) ORDER BY count(p) DESC LIMIT 100',
      'cypher_agg',
      4500,
      800,
      620000,
      100,
      '2026-06-19 03:10:00',
      'supplier_graph',
      '192.168.1.88',
      'analytics',
      'warning',
      'pending',
      'BATCH-' + batchDate + '-002'
    ],
    [
      'SQ-20260619-005',
      'MATCH (w:Warehouse {id: "WH-SH-03"})<-[:BELONGS_TO]-(s:Shelf) DETACH DELETE s',
      'cypher_delete',
      15000,
      8900,
      0,
      0,
      '2026-06-19 03:25:30',
      'warehouse_graph',
      '192.168.1.200',
      'maintenance',
      'critical',
      'pending',
      'BATCH-' + batchDate + '-002'
    ]
  ];
  for (const q of slowQueries) {
    await run(`
      INSERT INTO slow_queries 
      (query_id, query_text, query_type, execution_time_ms, lock_wait_time_ms,
       rows_scanned, rows_returned, execute_time, database_name, caller_ip,
       caller_user, severity, status, batch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, q);
  }

  const items = [
    [
      'ITEM-001',
      'BATCH-' + batchDate + '-001',
      1,
      'slow_query',
      '华东仓商品统计查询超时',
      '全表扫描125万行，执行时间8.5秒，其中锁等待2.3秒',
      'critical',
      'resolved',
      'zhangwei',
      '已添加region索引，建议限制结果集分页查询',
      '2026-06-19 08:30:00'
    ],
    [
      'ITEM-002',
      'BATCH-' + batchDate + '-001',
      2,
      'slow_query',
      '库存路径查询深度过大',
      '5层路径查询遍历320万节点，锁等待5.6秒',
      'critical',
      'resolved',
      'zhangwei',
      '限制路径深度为3层，使用APOC过程优化',
      '2026-06-19 09:15:00'
    ],
    [
      'ITEM-003',
      'BATCH-' + batchDate + '-001',
      3,
      'lock_wait',
      '订单状态批量更新锁等待过长',
      '单次更新1280条订单，锁等待4.1秒',
      'warning',
      'approved',
      'liming',
      '复核通过：月底盘点期间批量操作为正常业务，已确认影响范围可控',
      '2026-06-19 10:00:00'
    ],
    [
      'ITEM-004',
      'BATCH-' + batchDate + '-002',
      4,
      'slow_query',
      '供应商商品聚合查询性能差',
      '全表扫描62万行，无索引加速聚合',
      'warning',
      'pending',
      null,
      null,
      null
    ],
    [
      'ITEM-005',
      'BATCH-' + batchDate + '-002',
      5,
      'lock_wait',
      '货架删除操作锁等待过久',
      '删除操作持有写锁8.9秒，阻塞其他读取操作',
      'critical',
      'pending',
      null,
      null,
      null
    ],
    [
      'ITEM-006',
      'BATCH-' + batchDate + '-002',
      null,
      'backup_check',
      '备份文件完整性校验',
      '6份备份文件MD5校验全部通过',
      'info',
      'resolved',
      'liming',
      '备份校验通过，与慢查询归因共用本批次',
      '2026-06-19 04:00:00'
    ]
  ];
  for (const i of items) {
    await run(`
      INSERT INTO inspection_items 
      (item_id, batch_id, slow_query_id, item_type, title, description,
       severity, status, handler, handle_opinion, handle_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, i);
  }

  const reports = [
    [
      'REPORT-' + batchDate + '-001',
      'BATCH-' + batchDate + '-001',
      '2026-06-19 图数据库关系巡检日报',
      '本批次共发现12条慢查询，其中严重2条，警告3条。已完成全部处理。',
      '各位同事好，今天凌晨的图数据库巡检发现以下情况：\n\n1. 华东仓的商品统计查询跑了8.5秒，原因是全表扫了125万行数据。我们已经加了region字段的索引，建议以后查大数量时用分页。\n\n2. 有一个库存路径查询跑了12秒，因为查了5层路径太深了。已经改成最多查3层，用APOC工具优化了。\n\n3. 订单批量更新的时候锁等了4.1秒，这个是月底盘点的正常操作，李明已经复核通过，影响范围可控。\n\n整体来看，除了锁等待那条是正常业务外，其他都是性能问题，已经处理完了。有疑问随时找巡检组。',
      12,
      2,
      3,
      12,
      'wangfang',
      'approved',
      '2026-06-19 14:00:00'
    ]
  ];
  for (const r of reports) {
    await run(`
      INSERT INTO inspection_reports 
      (report_id, batch_id, title, summary, plain_explanation,
       total_items, critical_count, warning_count, resolved_count,
       reviewer, review_status, review_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, r);
  }

  const audits = [
    [
      'AUDIT-001',
      'status_change',
      'inspection_item',
      'ITEM-003',
      'pending',
      'approved',
      'liming',
      '月底盘点期间批量操作为正常业务，已确认影响范围可控',
      '192.168.1.50'
    ],
    [
      'AUDIT-002',
      'status_change',
      'inspection_item',
      'ITEM-001',
      'pending',
      'resolved',
      'zhangwei',
      '添加索引后查询时间降至120ms',
      '192.168.1.51'
    ],
    [
      'AUDIT-003',
      'review',
      'inspection_report',
      'REPORT-' + batchDate + '-001',
      'draft',
      'approved',
      'wangfang',
      '审计组复核通过，处理依据充分',
      '192.168.1.60'
    ]
  ];
  for (const a of audits) {
    await run(`
      INSERT INTO audit_trail 
      (trail_id, action_type, target_type, target_id, old_value, new_value,
       operator, reason, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, a);
  }

  const backups = [
    [
      'BACKUP-001',
      'BATCH-' + batchDate + '-002',
      '2026-06-19 03:00:00',
      1073741824,
      '/backup/warehouse_graph/20260619/backup1.db',
      'verified',
      '2026-06-19 03:30:00',
      'MD5校验通过，数据完整'
    ],
    [
      'BACKUP-002',
      'BATCH-' + batchDate + '-002',
      '2026-06-19 03:05:00',
      536870912,
      '/backup/order_graph/20260619/backup1.db',
      'verified',
      '2026-06-19 03:35:00',
      'MD5校验通过，数据完整'
    ]
  ];
  for (const b of backups) {
    await run(`
      INSERT INTO backup_records 
      (backup_id, batch_id, backup_time, backup_size_bytes, backup_path,
       verification_status, verification_time, verification_result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, b);
  }

  console.log('示例数据植入完成');
  console.log('  用户:', users.length, '个');
  console.log('  巡检批次:', batches.length, '个');
  console.log('  慢查询日志:', slowQueries.length, '条');
  console.log('  巡检条目:', items.length, '条');
  console.log('  巡检报告:', reports.length, '份');
  console.log('  审计记录:', audits.length, '条');
  console.log('  备份记录:', backups.length, '条');
}

async function main() {
  try {
    await seedData();
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedData };
