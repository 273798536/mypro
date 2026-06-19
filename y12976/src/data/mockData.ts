import type { MigrationBatch, MigrationScript } from '@/types';

const sqlScript1 = `-- ODS 订单明细加列
-- 来源材料: 2026-Q2 订单域扩展需求 V3.2.docx
ALTER TABLE ods_order_detail
ADD COLUMN discount_amount DECIMAL(18,4) DEFAULT 0 COMMENT '优惠金额';

ALTER TABLE ods_order_detail
ADD COLUMN coupon_code VARCHAR(64) DEFAULT '' COMMENT '优惠券编码';

-- 分页查询（缺 ORDER BY，分页顺序不稳定）
SELECT order_id, user_id, amount, create_time
FROM ods_order_detail
WHERE create_time >= '2026-05-01'
LIMIT 100 OFFSET 0;

SELECT order_id, user_id, amount, create_time
FROM ods_order_detail
WHERE create_time >= '2026-05-01'
LIMIT 100 OFFSET 100;`;

const sqlScript2 = `-- DWD 用户事件删索引
-- 来源材料: 用户行为分析性能优化方案.pdf
-- 警告: 无 BACKUP 语句，存在备份缺口
ALTER TABLE dwd_user_event
DROP INDEX idx_event_time_user;

ALTER TABLE dwd_user_event
DROP INDEX idx_page_duration;

CREATE INDEX idx_user_event_type
ON dwd_user_event(user_id, event_type, event_time);

-- 统计查询
SELECT event_type, COUNT(*)
FROM dwd_user_event
WHERE event_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY event_type;`;

const sqlScript3 = `-- DWS 日报表改索引
-- 来源材料: 报表性能瓶颈分析与优化方案.docx
ALTER TABLE dws_daily_report
DROP INDEX idx_report_date;

ALTER TABLE dws_daily_report
ADD INDEX idx_date_region(report_date, region_code);

ALTER TABLE dws_daily_report
ADD COLUMN region_code VARCHAR(16) DEFAULT '' COMMENT '区域编码';

-- 慢查询归因
SELECT report_date, region_code, SUM(pv) as total_pv
FROM dws_daily_report
WHERE report_date BETWEEN '2026-04-01' AND '2026-06-01'
GROUP BY report_date, region_code
ORDER BY total_pv DESC;`;

const sqlScript4 = `-- ADM 用户画像表创建
-- 来源材料: 用户画像标签体系建设方案 V2.1.pdf
-- 注意: 表名拼写错误 adm_user_profie -> 应为 adm_user_profile
CREATE TABLE IF NOT EXISTS adm_user_profie (
  user_id BIGINT PRIMARY KEY COMMENT '用户ID',
  gender TINYINT COMMENT '性别 1男 2女',
  age_group VARCHAR(16) COMMENT '年龄段',
  consume_level VARCHAR(16) COMMENT '消费水平',
  active_level VARCHAR(16) COMMENT '活跃度',
  last_login_time DATETIME COMMENT '最后登录时间',
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT '用户画像主表';

-- 标签导入
INSERT INTO adm_user_profie(user_id, gender, age_group)
SELECT user_id, gender, age_group
FROM ods_user_base
WHERE user_id > 0;`;

const sqlScript5 = `-- ODS 支付域删列
-- 来源材料: 支付系统字段清理方案.docx
-- 风险: 列仍被视图引用，属破坏性变更
ALTER TABLE ods_payment_transaction
DROP COLUMN old_merchant_code;

ALTER TABLE ods_payment_transaction
DROP COLUMN legacy_bank_channel;

-- 依赖视图（需要同步修改）
CREATE OR REPLACE VIEW vw_payment_summary AS
SELECT
  transaction_id,
  merchant_id,
  old_merchant_code,
  amount,
  status,
  create_time
FROM ods_payment_transaction
WHERE status = 'SUCCESS';`;

export const mockScripts: MigrationScript[] = [
  {
    id: 'script-001',
    batchId: 'batch-001',
    fileName: '20260618_ods_order_detail_add_columns.sql',
    sourceMaterial: '2026-Q2 订单域扩展需求 V3.2.docx',
    sqlContent: sqlScript1,
    status: 'pending',
    anomalies: [
      {
        id: 'anom-001-1',
        type: 'pagination_unstable',
        severity: 'warning',
        title: '分页查询缺少 ORDER BY',
        description: '第 12-19 行的分页查询未指定明确的 ORDER BY 子句，相同数据在不同执行环境下返回顺序可能不一致，导致分页结果重复或遗漏。',
        sourceMaterial: '2026-Q2 订单域扩展需求 V3.2.docx',
        lineRange: 'L12-L19',
        handlingOpinion: '建议添加 ORDER BY order_id DESC 确保分页顺序稳定。如果业务上允许接受一定程度的顺序波动，也请显式指定 ORDER BY create_time DESC，至少保证同一批次内顺序一致。',
      },
    ],
    conclusions: [
      {
        version: 1,
        content: '脚本逻辑正确，但分页查询存在顺序不稳定风险。建议补充 ORDER BY 子句后再上线。',
        createdAt: '2026-06-18 14:30:22',
      },
    ],
    operations: [],
  },
  {
    id: 'script-002',
    batchId: 'batch-001',
    fileName: '20260618_dwd_user_event_index_optimize.sql',
    sourceMaterial: '用户行为分析性能优化方案.pdf',
    sqlContent: sqlScript2,
    status: 'pending',
    anomalies: [
      {
        id: 'anom-002-1',
        type: 'backup_gap',
        severity: 'critical',
        title: '删除索引前未备份',
        description: '第 6-9 行直接删除两个索引，但未执行 CREATE TABLE ... AS SELECT 或 SHOW CREATE TABLE 备份原有索引定义。一旦删除后发现影响查询性能，无法快速回滚。',
        sourceMaterial: '用户行为分析性能优化方案.pdf',
        lineRange: 'L6-L9',
        handlingOpinion: '删除索引前必须执行 SHOW CREATE TABLE dwd_user_event 并将结果保存到变更工单附件。建议先执行 ALTER TABLE IGNORE ... DROP INDEX 或者在低峰期操作，操作前确认相关慢查询日志中无依赖该索引的查询。',
      },
      {
        id: 'anom-002-2',
        type: 'slow_query_risk',
        severity: 'warning',
        title: '索引重建期间可能影响写入',
        description: '第 11 行新建索引，dwd_user_event 为亿级表，DDL 执行时间预计超过 30 分钟，期间 DML 操作会被阻塞。',
        sourceMaterial: '用户行为分析性能优化方案.pdf',
        lineRange: 'L11',
        handlingOpinion: '建议使用 pt-online-schema-change 或 gh-ost 工具在线变更，或者选择在凌晨 2-4 点业务低峰期执行。',
      },
    ],
    conclusions: [
      {
        version: 1,
        content: '存在备份缺口风险，删除索引前必须备份索引定义并确认无依赖查询。建议使用在线 DDL 工具执行。',
        createdAt: '2026-06-18 15:12:08',
      },
    ],
    operations: [],
  },
  {
    id: 'script-003',
    batchId: 'batch-001',
    fileName: '20260618_dws_daily_report_refactor.sql',
    sourceMaterial: '报表性能瓶颈分析与优化方案.docx',
    sqlContent: sqlScript3,
    status: 'manual_review',
    anomalies: [
      {
        id: 'anom-003-1',
        type: 'schema_drift',
        severity: 'warning',
        title: 'Schema 漂移：索引变更改变查询执行计划',
        description: '删除 idx_report_date 并新建 idx_date_region 后，查询优化器可能选择不同的执行计划。原查询使用 idx_report_date 扫描约 5 万行，新索引可能导致回表次数增加。',
        sourceMaterial: '报表性能瓶颈分析与优化方案.docx',
        lineRange: 'L6-L11',
        handlingOpinion: '已在测试环境验证，新索引覆盖了 report_date + region_code 过滤条件，实际执行效率提升约 40%。判断从"风险"改为"接受"，属于 Schema 对比改变了判断的案例。',
      },
    ],
    schemaDiff: {
      before: `CREATE TABLE dws_daily_report (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL,
  pv INT DEFAULT 0,
  uv INT DEFAULT 0,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_date(report_date)
) ENGINE=InnoDB;`,
      after: `CREATE TABLE dws_daily_report (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL,
  region_code VARCHAR(16) DEFAULT '',
  pv INT DEFAULT 0,
  uv INT DEFAULT 0,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date_region(report_date, region_code)
) ENGINE=InnoDB;`,
      changes: [
        '新增列 region_code VARCHAR(16)',
        '删除索引 idx_report_date',
        '新增复合索引 idx_date_region(report_date, region_code)',
      ],
      judgmentChanged: true,
    },
    slowQueryAttribution: {
      query: `SELECT report_date, region_code, SUM(pv) as total_pv
FROM dws_daily_report
WHERE report_date BETWEEN ? AND ?
GROUP BY report_date, region_code
ORDER BY total_pv DESC;`,
      beforeMs: 1287,
      afterMs: 756,
      rootCause: '原索引 idx_report_date 只能过滤 report_date，无法覆盖 region_code 分组，需要回表 52,341 次。新复合索引覆盖了过滤条件和分组字段，回表次数降为 0。',
      beforeAfterDiff: '优化前：扫描 52,341 行，Using where; Using temporary; Using filesort | 优化后：扫描 31,208 行，Using index; Using filesort。性能提升 41.3%。',
    },
    conclusions: [
      {
        version: 1,
        content: 'Schema 变更存在索引切换风险，可能影响报表查询性能，建议上线前在预发布环境验证。',
        createdAt: '2026-06-18 10:15:33',
      },
      {
        version: 2,
        content: '【更新】经过 Schema 对比和慢查询归因分析，新索引实际提升性能 41.3%，判断从"风险"改为"接受"，可正常上线。',
        createdAt: '2026-06-18 16:45:12',
      },
    ],
    operations: [
      {
        id: 'op-003-1',
        type: 'rerun',
        label: '重复运行',
        operator: '张明（BI分析师）',
        timestamp: '2026-06-18 16:20:05',
        note: '在预发布环境重新执行 Schema 对比，确认新索引执行计划',
        result: '重复运行成功，执行计划与测试环境一致，性能提升 41.3%。',
      },
      {
        id: 'op-003-2',
        type: 'supplement',
        label: '补录',
        operator: '张明（BI分析师）',
        timestamp: '2026-06-18 16:35:47',
        note: '补充慢查询归因前后 EXPLAIN 结果截图到工单附件',
        result: '已上传 explain_before.png 和 explain_after.png，标注了 rows 从 52341 降到 31208。',
      },
      {
        id: 'op-003-3',
        type: 'manual_confirm',
        label: '人工确认',
        operator: '李华（DBA）',
        timestamp: '2026-06-18 16:42:18',
        note: '人工复核 Schema 变更影响范围，确认无关联视图或存储过程依赖旧索引',
        result: '人工确认通过，该表仅被报表系统使用，无其他下游依赖。判断更新为接受。',
      },
    ],
  },
  {
    id: 'script-004',
    batchId: 'batch-001',
    fileName: '20260618_adm_user_profile_create.sql',
    sourceMaterial: '用户画像标签体系建设方案 V2.1.pdf',
    sqlContent: sqlScript4,
    status: 'pending',
    anomalies: [
      {
        id: 'anom-004-1',
        type: 'breaking_change',
        severity: 'critical',
        title: '表名拼写错误',
        description: "第 6 行表名拼写为 adm_user_profie（缺少字母 'l'），正确应为 adm_user_profile。该错误会导致后续所有依赖该表的脚本、ETL 任务、报表查询全部失败。",
        sourceMaterial: '用户画像标签体系建设方案 V2.1.pdf',
        lineRange: 'L6',
        handlingOpinion: '这是典型的"材料里混进来的小麻烦"，建议在代码审核阶段强制检查表名与设计文档一致性。修复方式：将所有 adm_user_profie 改为 adm_user_profile，包括第 6 行建表和第 17 行 INSERT。',
      },
    ],
    conclusions: [
      {
        version: 1,
        content: '表名存在拼写错误，必须修复后再执行。属于低级错误但影响面大。',
        createdAt: '2026-06-18 13:55:41',
      },
    ],
    operations: [],
  },
  {
    id: 'script-005',
    batchId: 'batch-001',
    fileName: '20260618_ods_payment_cleanup.sql',
    sourceMaterial: '支付系统字段清理方案.docx',
    sqlContent: sqlScript5,
    status: 'pending',
    anomalies: [
      {
        id: 'anom-005-1',
        type: 'breaking_change',
        severity: 'critical',
        title: '删除列仍被视图引用',
        description: '第 6 行删除 old_merchant_code 列，但第 15 行的视图 vw_payment_summary 仍然引用该列。执行后视图会失效，所有依赖该视图的报表和下游任务都会报错。',
        sourceMaterial: '支付系统字段清理方案.docx',
        lineRange: 'L6, L15',
        handlingOpinion: '必须先修改或删除视图 vw_payment_summary，再执行 DROP COLUMN 操作。建议检查 INFORMATION_SCHEMA.VIEW_TABLE_USAGE 确认所有依赖关系。',
      },
      {
        id: 'anom-005-2',
        type: 'backup_gap',
        severity: 'warning',
        title: '删除列前未备份数据',
        description: '删除 old_merchant_code 和 legacy_bank_channel 两列前未执行数据备份。如果后续发现仍有业务场景需要这些字段，数据将无法恢复。',
        sourceMaterial: '支付系统字段清理方案.docx',
        lineRange: 'L6-L7',
        handlingOpinion: '建议先执行 CREATE TABLE ods_payment_transaction_backup_20260618 AS SELECT * FROM ods_payment_transaction，保留至少 30 天后再清理备份。',
      },
    ],
    conclusions: [
      {
        version: 1,
        content: '存在破坏性变更风险，删除列前必须先处理依赖视图并备份数据。',
        createdAt: '2026-06-18 12:28:15',
      },
    ],
    operations: [],
  },
];

export const mockBatches: MigrationBatch[] = [
  {
    id: 'batch-001',
    name: '2026-06-18 常规变更批次',
    importedAt: '2026-06-18 10:00:00',
    source: '手工导入',
    scriptIds: ['script-001', 'script-002', 'script-003', 'script-004', 'script-005'],
  },
];
