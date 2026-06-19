const { initSchema, run, get, all } = require('./db');
const materialService = require('./services/materialService');
const migrationService = require('./services/migrationService');
const reviewService = require('./services/reviewService');
const reportService = require('./services/reportService');
const { MATERIAL_TYPES } = require('./dao/materialDao');
const { ITEM_TYPES, ITEM_STATUS } = require('./dao/reviewDao');

const OPERATORS = {
  BACKEND_LEAD: 'zhangwei@example.com',
  DBA: 'liming@example.com',
  AUDITOR: 'wangfang@example.com',
  DEVOPS: 'chenjie@example.com'
};

const IMPORT_BATCH = 'batch-2024-w24-drift-check';

async function seed() {
  console.log('开始植入样例数据...');
  await initSchema();

  console.log('  1. 导入表结构快照材料...');
  const tableSnapshotV1 = await materialService.importMaterial(
    {
      type: MATERIAL_TYPES.TABLE_SNAPSHOT,
      source_env: 'prod',
      title: '订单表 order_info 结构快照 (v1)',
      import_batch: IMPORT_BATCH,
      remark: '有人维护，上周刚更新过',
      content: {
        table_name: 'order_info',
        engine: 'InnoDB',
        charset: 'utf8mb4',
        columns: [
          { name: 'id', type: 'bigint', nullable: false, primary: true, auto_increment: true },
          { name: 'order_no', type: 'varchar(64)', nullable: false, indexed: true, unique: true },
          { name: 'user_id', type: 'bigint', nullable: false, indexed: true },
          { name: 'status', type: 'tinyint', nullable: false, default: 0 },
          { name: 'amount', type: 'decimal(12,2)', nullable: false },
          { name: 'created_at', type: 'datetime', nullable: false },
          { name: 'updated_at', type: 'datetime', nullable: true }
        ],
        indexes: [
          { name: 'PRIMARY', columns: ['id'], unique: true },
          { name: 'uk_order_no', columns: ['order_no'], unique: true },
          { name: 'idx_user_id', columns: ['user_id'], unique: false }
        ],
        row_count: 5823419,
        data_size_mb: 1248
      }
    },
    OPERATORS.DBA
  );

  console.log('  2. 导入慢查询日志材料（带旧备注）...');
  const slowQueryLog = await materialService.importMaterial(
    {
      type: MATERIAL_TYPES.SLOW_QUERY_LOG,
      source_env: 'prod',
      title: '慢查询日志 - 2024-06-15 批次',
      import_batch: IMPORT_BATCH,
      remark: '旧备注：疑似索引问题，待确认（备注已过期，实际为业务增长导致）',
      content: {
        log_date: '2024-06-15',
        total_queries: 127,
        queries_over_10s: 23,
        queries: [
          {
            sql: 'SELECT * FROM order_info WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?, ?',
            exec_time: 12.3,
            rows_examined: 284521,
            rows_sent: 20,
            lock_wait_time: 8.7,
            db: 'order_db',
            host: '10.0.1.23'
          },
          {
            sql: 'UPDATE order_info SET status = ? WHERE id IN (SELECT order_id FROM order_items WHERE product_id = ?)',
            exec_time: 45.2,
            rows_examined: 1200000,
            rows_sent: 0,
            lock_wait_time: 38.5,
            db: 'order_db',
            host: '10.0.1.23'
          },
          {
            sql: 'SELECT COUNT(*) FROM order_info WHERE created_at BETWEEN ? AND ? AND status = ?',
            exec_time: 6.8,
            rows_examined: 452000,
            rows_sent: 1,
            lock_wait_time: 0.2,
            db: 'order_db',
            host: '10.0.1.24'
          }
        ]
      }
    },
    OPERATORS.DEVOPS
  );

  console.log('  3. 导入权限清单材料...');
  const permissionList = await materialService.importMaterial(
    {
      type: MATERIAL_TYPES.PERMISSION_LIST,
      source_env: 'prod',
      title: '数据库权限清单 - 生产环境',
      import_batch: IMPORT_BATCH,
      remark: '临时补的，还没核对完',
      content: {
        export_time: '2024-06-15 14:30:00',
        total_users: 42,
        users: [
          { user: 'app_user', host: '%', db: 'order_db', privileges: ['SELECT', 'INSERT', 'UPDATE'], with_grant: false },
          { user: 'report_user', host: '10.0.2.%', db: 'order_db', privileges: ['SELECT'], with_grant: false },
          { user: 'admin_user', host: 'localhost', db: '*', privileges: ['ALL PRIVILEGES'], with_grant: true },
          { user: 'legacy_bot', host: '10.0.3.55', db: 'order_db', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP'], with_grant: false },
          { user: 'test_user', host: '%', db: 'order_db', privileges: ['SELECT'], with_grant: false },
          { user: 'etl_user', host: '10.0.4.%', db: 'order_db', privileges: ['SELECT', 'LOCK TABLES'], with_grant: false }
        ],
        suspicious: ['legacy_bot 有 DROP 权限', 'test_user 允许任意主机连接']
      }
    },
    OPERATORS.DEVOPS
  );

  console.log('  4. 导入指标报表材料...');
  const metricReport = await materialService.importMaterial(
    {
      type: MATERIAL_TYPES.METRIC_REPORT,
      source_env: 'prod',
      title: '数据库性能指标周报 - 第24周',
      import_batch: IMPORT_BATCH,
      remark: '临时补，数据来源于监控系统自动导出',
      content: {
        week: 'W24',
        period: '2024-06-10 至 2024-06-16',
        databases: [
          {
            name: 'order_db',
            avg_qps: 12450,
            peak_qps: 28900,
            avg_latency_ms: 3.2,
            slow_query_count: 127,
            lock_wait_events: 342,
            avg_lock_wait_ms: 45.2,
            max_lock_wait_ms: 45200,
            deadlocks: 3
          }
        ],
        anomalies: [
          '周三14:00左右出现大批量更新导致锁等待飙升',
          '慢查询数量较上周增长35%'
        ]
      }
    },
    OPERATORS.DBA
  );

  console.log('  5. 创建迁移重复执行记录...');
  const migration = await migrationService.createMigration(
    {
      migration_name: 'add_order_index_202406',
      environment: 'prod',
      execution_count: 2
    },
    OPERATORS.BACKEND_LEAD
  );

  console.log('  6. 开始第一轮复核...');
  const { round } = await migrationService.startReview(migration.id, OPERATORS.AUDITOR);

  console.log('  7. 添加复核项：表结构检查...');
  const tableStructureItem = await reviewService.addReviewItem(
    round.id,
    tableSnapshotV1.id,
    ITEM_TYPES.TABLE_STRUCTURE,
    '表结构无明显问题，索引配置合理',
    OPERATORS.AUDITOR
  );

  console.log('  8. 添加复核项：慢查询归因（初始判断有误，后续修正）...');
  const slowQueryItem = await reviewService.addReviewItem(
    round.id,
    slowQueryLog.id,
    ITEM_TYPES.SLOW_QUERY_ATTRIBUTION,
    '初步判断为索引缺失导致慢查询，建议添加 (user_id, status, created_at) 联合索引',
    OPERATORS.AUDITOR
  );

  console.log('  9. 添加复核项：权限检查...');
  const permissionItem = await reviewService.addReviewItem(
    round.id,
    permissionList.id,
    ITEM_TYPES.PERMISSION_CHECK,
    '存在风险权限：legacy_bot 有 DROP 权限，test_user 允许任意主机连接，需要整改',
    OPERATORS.AUDITOR
  );

  console.log('  10. 添加复核项：分页顺序不稳定（坏数据示例）...');
  const paginationItem = await reviewService.addReviewItem(
    round.id,
    slowQueryLog.id,
    ITEM_TYPES.PAGINATION_ORDER,
    '分页查询使用 ORDER BY created_at DESC，但 created_at 非唯一，存在相同值时分页顺序不稳定',
    OPERATORS.AUDITOR
  );

  console.log('  11. 审核：表结构检查通过...');
  await reviewService.reviewItem(
    tableStructureItem.id,
    '表结构无明显问题，索引配置合理。注意：该迁移脚本曾执行两次，需确认重复执行是否造成数据异常。',
    ITEM_STATUS.APPROVED,
    OPERATORS.AUDITOR,
    '表结构确认无问题'
  );

  console.log('  12. 审核：慢查询归因（先通过，后续重新评估）...');
  await reviewService.reviewItem(
    slowQueryItem.id,
    '初步判断为索引缺失导致慢查询，建议添加 (user_id, status, created_at) 联合索引',
    ITEM_STATUS.APPROVED,
    OPERATORS.AUDITOR,
    '初始判断：索引问题'
  );

  console.log('  13. 审核：权限检查不通过...');
  await reviewService.reviewItem(
    permissionItem.id,
    '存在两项风险：1) legacy_bot 账号有 DROP 权限；2) test_user 允许任意主机连接。需要在迁移完成前整改。',
    ITEM_STATUS.REJECTED,
    OPERATORS.AUDITOR,
    '权限存在安全风险'
  );

  console.log('  14. 审核：分页顺序不稳定问题（被复核通过，认为影响不大）...');
  await reviewService.reviewItem(
    paginationItem.id,
    '分页顺序确实存在不稳定问题，但当前业务场景中同一秒内的订单量极少，用户感知不明显。建议后续版本优化，本次迁移先放行。',
    ITEM_STATUS.APPROVED,
    OPERATORS.AUDITOR,
    '分页顺序问题影响可接受'
  );

  console.log('  15. DBA 修正表结构快照，添加了新字段...');
  const tableSnapshotV2 = await materialService.updateMaterialVersion(
    tableSnapshotV1.id,
    {
      table_name: 'order_info',
      engine: 'InnoDB',
      charset: 'utf8mb4',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, primary: true, auto_increment: true },
        { name: 'order_no', type: 'varchar(64)', nullable: false, indexed: true, unique: true },
        { name: 'user_id', type: 'bigint', nullable: false, indexed: true },
        { name: 'status', type: 'tinyint', nullable: false, default: 0, indexed: true },
        { name: 'amount', type: 'decimal(12,2)', nullable: false },
        { name: 'pay_method', type: 'varchar(32)', nullable: true },
        { name: 'created_at', type: 'datetime', nullable: false },
        { name: 'updated_at', type: 'datetime', nullable: true }
      ],
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'uk_order_no', columns: ['order_no'], unique: true },
        { name: 'idx_user_id', columns: ['user_id'], unique: false },
        { name: 'idx_status', columns: ['status'], unique: false },
        { name: 'idx_user_status_created', columns: ['user_id', 'status', 'created_at'], unique: false }
      ],
      row_count: 5823419,
      data_size_mb: 1356,
      migration_applied: true,
      duplicate_execution: true
    },
    OPERATORS.DBA,
    '迁移脚本执行后的最新表结构，添加了 status 索引和联合索引'
  );

  console.log('  16. 重新评估慢查询归因（因为表结构改了，索引加上了，结论变了）...');
  await reviewService.reevaluateItem(
    slowQueryItem.id,
    '重新评估：索引已添加，慢查询问题应已解决。但第二个 UPDATE 语句的锁等待问题仍需关注，是业务批量更新导致的，不是索引问题。',
    OPERATORS.DBA,
    '表结构快照更新后重新评估，索引已添加，但锁等待是批量更新业务导致'
  );

  console.log('  17. 标记锁等待问题，关联到慢查询日志材料...');
  await migrationService.updateLockWaitIssue(
    migration.id,
    true,
    slowQueryLog.id,
    OPERATORS.AUDITOR
  );

  console.log('  18. 完成第一轮复核...');
  await reviewService.completeReviewRound(
    round.id,
    '第一轮复核完成：表结构检查通过，权限检查不通过需整改，分页顺序不稳定问题被认为影响可接受予以放行。慢查询归因在表结构更新后被重新评估，锁等待过长问题定位在慢查询日志材料上，需进一步分析批量更新业务。',
    OPERATORS.AUDITOR
  );

  console.log('  19. 生成各类报告...');
  await reportService.generateRoundSummaryReport(migration.id, round.id, OPERATORS.AUDITOR);
  await reportService.generateLockWaitAnalysisReport(migration.id, OPERATORS.AUDITOR);
  await reportService.generateConclusionComparisonReport(migration.id, round.id, OPERATORS.AUDITOR);
  await reportService.generateFullAuditReport(migration.id, OPERATORS.AUDITOR);

  console.log('\n========================================');
  console.log('  样例数据植入完成！');
  console.log('========================================');
  console.log(`  材料导入批次: ${IMPORT_BATCH}`);
  console.log(`  迁移记录ID: ${migration.id}`);
  console.log(`  复核轮次ID: ${round.id}`);
  console.log(`  表结构快照 v1: ${tableSnapshotV1.id}`);
  console.log(`  表结构快照 v2: ${tableSnapshotV2.id}`);
  console.log(`  慢查询日志: ${slowQueryLog.id}`);
  console.log(`  权限清单: ${permissionList.id}`);
  console.log('  ');
  console.log('  同一轮复核包含的问题：');
  console.log('  - 表结构检查 (已通过)');
  console.log('  - 慢查询归因 (已重新评估，结论有变化)');
  console.log('  - 权限检查 (不通过)');
  console.log('  - 分页顺序不稳定 (被通过，认为影响不大)');
  console.log('  ');
  console.log('  审计追踪覆盖：');
  console.log('  - 谁改的 (wangfang@example.com / liming@example.com)');
  console.log('  - 什么时候改的 (有时间戳)');
  console.log('  - 为什么改 (reason 字段)');
  console.log('  ');
  console.log('  坏数据示例：');
  console.log('  - 慢查询日志带着旧备注（索引问题的判断已过期）');
  console.log('  - 权限清单是临时补的，还没核对完');
  console.log('  - 分页顺序不稳定被复核通过了（争议决策）');
  console.log('  - 锁等待卡在哪份材料上（慢查询日志）');
  console.log('========================================');
}

seed().catch(err => {
  console.error('植入数据失败:', err);
  process.exit(1);
});
