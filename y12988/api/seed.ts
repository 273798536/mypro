import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db.js'

const FIXED_IDS = {
  snapshot1: 'a0000001-0000-0000-0000-000000000001',
  snapshot2: 'a0000001-0000-0000-0000-000000000002',
  snapshot3: 'a0000001-0000-0000-0000-000000000003',
  snapshot4: 'a0000001-0000-0000-0000-000000000004',
  conclusion1: 'b0000001-0000-0000-0000-000000000001',
  conclusion2: 'b0000001-0000-0000-0000-000000000002',
  conclusion3: 'b0000001-0000-0000-0000-000000000003',
  conclusion4: 'b0000001-0000-0000-0000-000000000004',
  log1: 'c0000001-0000-0000-0000-000000000001',
  log2: 'c0000001-0000-0000-0000-000000000002',
  log3: 'c0000001-0000-0000-0000-000000000003',
  log4: 'c0000001-0000-0000-0000-000000000004',
  log5: 'c0000001-0000-0000-0000-000000000005',
  log6: 'c0000001-0000-0000-0000-000000000006',
  log7: 'c0000001-0000-0000-0000-000000000007',
  log8: 'c0000001-0000-0000-0000-000000000008',
  log9: 'c0000001-0000-0000-0000-000000000009',
  log10: 'c0000001-0000-0000-0000-000000000010',
  log11: 'c0000001-0000-0000-0000-000000000011',
  log12: 'c0000001-0000-0000-0000-000000000012',
  script1: 'd0000001-0000-0000-0000-000000000001',
  script2: 'd0000001-0000-0000-0000-000000000002',
  script3: 'd0000001-0000-0000-0000-000000000003',
}

export function seedData(): void {
  const db = getDb()

  const count = db.prepare('SELECT COUNT(*) as cnt FROM migrations').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  const insertMigration = db.prepare(`
    INSERT INTO migrations (id, name, status, related_log_count, conflict_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertLog = db.prepare(`
    INSERT INTO slow_query_logs (id, batch_id, query_text, execution_time_ms, source_file, original_line_no, is_duplicate, import_round, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertScript = db.prepare(`
    INSERT INTO migration_scripts (id, name, version, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  const insertConflict = db.prepare(`
    INSERT INTO conflicts (id, log_id, script_id, type, severity, description, chart_data_ref, table_row_ref, conclusion_id, resolved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertBackupGap = db.prepare(`
    INSERT INTO backup_gaps (id, original_line_no, image_name, source_remark, source_table, source_record_id, description, conclusion_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertConclusion = db.prepare(`
    INSERT INTO conclusions (id, content, related_snapshot_id, immutable, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  const insertSnapshot = db.prepare(`
    INSERT INTO snapshots (id, table_name, schema_ddl, conclusion_id, captured_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  const updateSnapshotConclusion = db.prepare(`
    UPDATE snapshots SET conclusion_id = ? WHERE id = ?
  `)

  const insertIndexSuggestion = db.prepare(`
    INSERT INTO index_suggestions (id, table_name, suggested_index, reason, explanation, impact, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertScriptLogRelation = db.prepare(`
    INSERT INTO script_log_relations (script_id, log_id) VALUES (?, ?)
  `)

  const insertSuggestionLogRelation = db.prepare(`
    INSERT INTO suggestion_log_relations (suggestion_id, log_id) VALUES (?, ?)
  `)

  const transaction = db.transaction(() => {
    insertMigration.run(uuidv4(), '用户表字段迁移', 'completed', 3, 1, now, now)
    insertMigration.run(uuidv4(), '订单表索引优化', 'conflict', 4, 2, now, now)
    insertMigration.run(uuidv4(), '商品表结构变更', 'running', 2, 1, now, now)
    insertMigration.run(uuidv4(), '支付表分表迁移', 'pending', 1, 0, now, now)
    insertMigration.run(uuidv4(), '日志表归档迁移', 'pending', 2, 1, now, now)

    insertLog.run(FIXED_IDS.log1, 'batch-2024-001', 'SELECT * FROM users WHERE phone IS NULL', 3200, '/logs/slow_20240115.log', 42, 0, 1, now)
    insertLog.run(FIXED_IDS.log2, 'batch-2024-001', 'SELECT order_id, amount FROM orders WHERE status = 0 AND created_at > datetime("now","-7 days")', 5100, '/logs/slow_20240115.log', 78, 0, 1, now)
    insertLog.run(FIXED_IDS.log3, 'batch-2024-001', 'UPDATE products SET stock = stock - 1 WHERE id = 999', 2800, '/logs/slow_20240115.log', 105, 0, 1, now)
    insertLog.run(FIXED_IDS.log4, 'batch-2024-001', 'SELECT u.name, COUNT(o.id) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id', 8700, '/logs/slow_20240115.log', 130, 0, 1, now)
    insertLog.run(FIXED_IDS.log5, 'batch-2024-001', 'DELETE FROM sessions WHERE expired_at < datetime("now")', 4100, '/logs/slow_20240115.log', 156, 0, 1, now)
    insertLog.run(FIXED_IDS.log6, 'batch-2024-001', 'SELECT * FROM payments WHERE transaction_no LIKE "TXN%" AND amount > 10000', 6200, '/logs/slow_20240115.log', 189, 0, 1, now)

    insertLog.run(FIXED_IDS.log7, 'batch-2024-002', 'SELECT category, AVG(price) FROM products GROUP BY category HAVING AVG(price) > 500', 3500, '/logs/slow_20240120.log', 23, 0, 1, now)
    insertLog.run(FIXED_IDS.log8, 'batch-2024-002', 'INSERT INTO order_logs (order_id, action, created_at) VALUES (?, ?, datetime("now"))', 2900, '/logs/slow_20240120.log', 55, 0, 1, now)
    insertLog.run(FIXED_IDS.log9, 'batch-2024-002', 'SELECT * FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE status = 1)', 7800, '/logs/slow_20240120.log', 88, 0, 1, now)
    insertLog.run(FIXED_IDS.log10, 'batch-2024-002', 'ALTER TABLE orders ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0', 9500, '/logs/slow_20240120.log', 112, 0, 1, now)

    insertLog.run(FIXED_IDS.log11, 'batch-2024-001', 'SELECT * FROM users WHERE phone IS NULL', 3150, '/logs/slow_20240122.log', 42, 1, 2, now)
    insertLog.run(FIXED_IDS.log12, 'batch-2024-001', 'SELECT order_id, amount FROM orders WHERE status = 0 AND created_at > datetime("now","-7 days")', 5200, '/logs/slow_20240122.log', 78, 1, 2, now)

    insertScript.run(FIXED_IDS.script1, 'v1_用户表添加手机号字段', 1, 'ALTER TABLE users ADD COLUMN phone VARCHAR(20);\nCREATE INDEX idx_users_phone ON users(phone);', now)
    insertScript.run(FIXED_IDS.script2, 'v2_订单表添加联合索引', 2, 'CREATE INDEX idx_orders_status_created ON orders(status, created_at);\nANALYZE orders;', now)
    insertScript.run(FIXED_IDS.script3, 'v3_商品表拆分详情字段', 1, 'CREATE TABLE product_details (\n  id INTEGER PRIMARY KEY,\n  product_id INTEGER NOT NULL,\n  description TEXT,\n  specs JSON,\n  FOREIGN KEY (product_id) REFERENCES products(id)\n);\nINSERT INTO product_details (product_id, description, specs)\n  SELECT id, description, specs FROM products;\nALTER TABLE products DROP COLUMN description;\nALTER TABLE products DROP COLUMN specs;', now)

    insertSnapshot.run(FIXED_IDS.snapshot1, 'users', 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, phone VARCHAR(20));\nCREATE INDEX idx_users_phone ON users(phone);', null, now)
    insertSnapshot.run(FIXED_IDS.snapshot2, 'orders', 'CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount DECIMAL(10,2), status INTEGER, created_at TEXT, discount_rate DECIMAL(5,2));\nCREATE INDEX idx_orders_status_created ON orders(status, created_at);', null, now)
    insertSnapshot.run(FIXED_IDS.snapshot3, 'products', 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price DECIMAL(10,2), stock INTEGER, category TEXT);', null, now)
    insertSnapshot.run(FIXED_IDS.snapshot4, 'payments', 'CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER, transaction_no TEXT, amount DECIMAL(10,2), paid_at TEXT);', null, now)

    insertConclusion.run(FIXED_IDS.conclusion1, '用户表添加手机号字段后，查询性能提升约40%，phone字段索引命中率达标。该结论基于快照比对确认无回归风险。', FIXED_IDS.snapshot1, 1, now)
    insertConclusion.run(FIXED_IDS.conclusion2, '订单表联合索引优化后，status+created_at组合查询延迟从5.1s降至0.3s，但需关注高并发下索引维护开销。', FIXED_IDS.snapshot2, 1, now)
    insertConclusion.run(FIXED_IDS.conclusion3, '商品表拆分详情字段存在schema不匹配风险，product_details外键约束可能与历史数据冲突，建议先清洗再迁移。', FIXED_IDS.snapshot3, 0, now)
    insertConclusion.run(FIXED_IDS.conclusion4, '支付表大额交易查询仍需优化，transaction_no前缀匹配无法利用B+树索引，建议改用哈希索引或全文索引。', FIXED_IDS.snapshot4, 0, now)

    updateSnapshotConclusion.run(FIXED_IDS.conclusion1, FIXED_IDS.snapshot1)
    updateSnapshotConclusion.run(FIXED_IDS.conclusion2, FIXED_IDS.snapshot2)
    updateSnapshotConclusion.run(FIXED_IDS.conclusion3, FIXED_IDS.snapshot3)
    updateSnapshotConclusion.run(FIXED_IDS.conclusion4, FIXED_IDS.snapshot4)

    insertConflict.run(uuidv4(), FIXED_IDS.log3, FIXED_IDS.script3, 'schema_mismatch', 'high', '商品表拆分时stock字段更新与详情表外键约束存在模式不匹配，UPDATE语句可能违反外键约束', 'chart:conflict_schema_001', 'row:products_stock_update', FIXED_IDS.conclusion3, 0, now)
    insertConflict.run(uuidv4(), FIXED_IDS.log4, FIXED_IDS.script2, 'index_conflict', 'medium', '订单表联合索引与GROUP BY查询存在索引冲突，优化器可能选择全表扫描而非索引扫描', 'chart:conflict_index_001', 'row:orders_group_by', FIXED_IDS.conclusion2, 0, now)
    insertConflict.run(uuidv4(), FIXED_IDS.log6, FIXED_IDS.script1, 'performance_degradation', 'high', '支付表大额交易查询在添加手机号索引后性能下降，LIKE前缀匹配无法利用B+树索引', 'chart:conflict_perf_001', 'row:payments_like_query', FIXED_IDS.conclusion4, 0, now)
    insertConflict.run(uuidv4(), FIXED_IDS.log9, FIXED_IDS.script2, 'index_conflict', 'low', '子查询IN列表过大导致索引失效，建议改用JOIN方式', 'chart:conflict_index_002', 'row:user_profiles_subquery', null, 0, now)
    insertConflict.run(uuidv4(), FIXED_IDS.log10, FIXED_IDS.script3, 'schema_mismatch', 'medium', 'ALTER TABLE期间表锁导致慢查询，建议在低峰期执行DDL变更', 'chart:conflict_schema_002', 'row:orders_alter_ddl', FIXED_IDS.conclusion2, 1, now)

    insertBackupGap.run(uuidv4(), 42, 'slow_query_chart_001.png', '来源于2024-01-15慢查询日志第42行', 'slow_query_logs', FIXED_IDS.log1, '手机号为空的用户查询记录缺失备份，原始图表slow_query_chart_001.png未归档', FIXED_IDS.conclusion1, now)
    insertBackupGap.run(uuidv4(), 130, 'join_analysis_chart.png', '来源于2024-01-15 JOIN分析报告第130行', 'slow_query_logs', FIXED_IDS.log4, '用户订单JOIN聚合查询的分析图表未备份，影响结论可追溯性', FIXED_IDS.conclusion2, now)
    insertBackupGap.run(uuidv4(), 88, 'subquery_perf.png', '来源于2024-01-20子查询性能分析第88行', 'slow_query_logs', FIXED_IDS.log9, '子查询性能分析图表缺失，需要补录原始性能对比数据', null, now)

    const sug1 = uuidv4()
    const sug2 = uuidv4()
    const sug3 = uuidv4()
    const sug4 = uuidv4()
    const sug5 = uuidv4()

    insertIndexSuggestion.run(sug1, 'users', 'CREATE INDEX idx_users_phone ON users(phone)', '手机号字段查询频繁但缺少索引', '用户表phone字段用于登录和查询，当前全表扫描导致查询耗时3.2s，添加索引后预计降至50ms以内', 'high', now)
    insertIndexSuggestion.run(sug2, 'orders', 'CREATE INDEX idx_orders_status_created ON orders(status, created_at)', '订单状态+创建时间组合查询高频出现', '订单列表页按状态筛选并按时间排序是核心场景，联合索引可消除排序和大量扫描', 'high', now)
    insertIndexSuggestion.run(sug3, 'products', 'CREATE INDEX idx_products_category ON products(category)', '商品分类聚合查询缺少索引', '按分类统计均价和数量的查询耗时3.5s，分类字段基数低但查询频率高，适合添加索引', 'medium', now)
    insertIndexSuggestion.run(sug4, 'payments', 'CREATE INDEX idx_payments_transaction_no ON payments(transaction_no)', '大额交易按流水号查询缺少索引', 'LIKE前缀匹配无法利用B+树，但精确匹配场景仍需索引支持，预计提升60%查询性能', 'medium', now)
    insertIndexSuggestion.run(sug5, 'sessions', 'CREATE INDEX idx_sessions_expired_at ON sessions(exppired_at)', '过期会话清理语句缺少索引', 'DELETE批量清理过期会话每次扫描全表，添加索引后可精确定位过期记录，减少锁持有时间', 'low', now)

    insertScriptLogRelation.run(FIXED_IDS.script1, FIXED_IDS.log1)
    insertScriptLogRelation.run(FIXED_IDS.script1, FIXED_IDS.log6)
    insertScriptLogRelation.run(FIXED_IDS.script2, FIXED_IDS.log2)
    insertScriptLogRelation.run(FIXED_IDS.script2, FIXED_IDS.log4)
    insertScriptLogRelation.run(FIXED_IDS.script2, FIXED_IDS.log10)
    insertScriptLogRelation.run(FIXED_IDS.script3, FIXED_IDS.log3)
    insertScriptLogRelation.run(FIXED_IDS.script3, FIXED_IDS.log9)

    insertSuggestionLogRelation.run(sug1, FIXED_IDS.log1)
    insertSuggestionLogRelation.run(sug1, FIXED_IDS.log11)
    insertSuggestionLogRelation.run(sug2, FIXED_IDS.log2)
    insertSuggestionLogRelation.run(sug2, FIXED_IDS.log4)
    insertSuggestionLogRelation.run(sug3, FIXED_IDS.log7)
    insertSuggestionLogRelation.run(sug4, FIXED_IDS.log6)
    insertSuggestionLogRelation.run(sug5, FIXED_IDS.log5)
  })

  transaction()
}
