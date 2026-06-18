-- 报表口径血缘追踪系统 - 数据库结构

-- 慢查询日志表：核心数据源
CREATE TABLE IF NOT EXISTS slow_query_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id VARCHAR(64) UNIQUE NOT NULL,
    query_sql TEXT NOT NULL,
    query_db VARCHAR(64) NOT NULL,
    execution_time FLOAT NOT NULL,
    execution_date DATE NOT NULL,
    execution_user VARCHAR(64) NOT NULL,
    report_name VARCHAR(128),
    source_table VARCHAR(256),
    target_table VARCHAR(256),
    import_batch_id VARCHAR(64),
    is_dirty BOOLEAN DEFAULT 0,
    dirty_reason VARCHAR(256),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据字典表：字段口径定义
CREATE TABLE IF NOT EXISTS data_dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name VARCHAR(128) NOT NULL,
    column_name VARCHAR(128) NOT NULL,
    data_type VARCHAR(64) NOT NULL,
    business_caliber TEXT,
    technical_definition TEXT,
    owner_department VARCHAR(64),
    is_obsolete BOOLEAN DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, column_name, version)
);

-- 迁移记录表：SQL脚本迁移历史
CREATE TABLE IF NOT EXISTS migration_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id VARCHAR(64) UNIQUE NOT NULL,
    migration_name VARCHAR(256) NOT NULL,
    migration_type VARCHAR(32) NOT NULL,
    source_sql TEXT NOT NULL,
    target_sql TEXT,
    manual_remark TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    executor VARCHAR(64) NOT NULL,
    execution_time TIMESTAMP,
    affected_rows INTEGER DEFAULT 0,
    parent_migration_id VARCHAR(64),
    is_rollback BOOLEAN DEFAULT 0,
    rollback_from_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回滚历史表：记录每次回滚的前后状态
CREATE TABLE IF NOT EXISTS rollback_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id VARCHAR(64) NOT NULL,
    original_migration_id INTEGER NOT NULL,
    before_status VARCHAR(32) NOT NULL,
    after_status VARCHAR(32) NOT NULL,
    before_data_snapshot TEXT,
    after_data_snapshot TEXT,
    rollback_reason TEXT,
    executor VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 血缘追踪结果表
CREATE TABLE IF NOT EXISTS lineage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineage_id VARCHAR(64) UNIQUE NOT NULL,
    report_name VARCHAR(128) NOT NULL,
    caliber_expression TEXT NOT NULL,
    source_tables TEXT,
    source_columns TEXT,
    target_table VARCHAR(128),
    target_column VARCHAR(128),
    dependency_depth INTEGER DEFAULT 0,
    slow_query_log_id INTEGER,
    migration_id INTEGER,
    analysis_version INTEGER DEFAULT 1,
    is_manual_confirmed BOOLEAN DEFAULT 0,
    confirmed_by VARCHAR(64),
    confirmed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slow_query_log_id) REFERENCES slow_query_logs(id),
    FOREIGN KEY (migration_id) REFERENCES migration_records(id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    permission_scope VARCHAR(32) NOT NULL,
    allowed_actions TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role, permission_scope)
);

-- 权限越权审计表
CREATE TABLE IF NOT EXISTS permission_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    original_result TEXT,
    overridden_result TEXT,
    has_override BOOLEAN DEFAULT 0,
    audit_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 人工确认记录表
CREATE TABLE IF NOT EXISTS manual_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confirmation_id VARCHAR(64) UNIQUE NOT NULL,
    business_type VARCHAR(64) NOT NULL,
    business_id VARCHAR(64) NOT NULL,
    original_data TEXT,
    corrected_data TEXT,
    confirmation_reason TEXT,
    confirmed_by VARCHAR(64) NOT NULL,
    is_supplement BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分析快照表：用于新旧结论并排对比
CREATE TABLE IF NOT EXISTS analysis_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id VARCHAR(64) UNIQUE NOT NULL,
    snapshot_type VARCHAR(32) NOT NULL,
    baseline_snapshot_id VARCHAR(64),
    report_name VARCHAR(128),
    slow_query_log_ids TEXT,
    lineage_ids TEXT,
    analysis_result TEXT,
    is_baseline BOOLEAN DEFAULT 0,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_slow_log_date ON slow_query_logs(execution_date);
CREATE INDEX IF NOT EXISTS idx_slow_log_report ON slow_query_logs(report_name);
CREATE INDEX IF NOT EXISTS idx_lineage_report ON lineage_tracking(report_name);
CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_records(status);
CREATE INDEX IF NOT EXISTS idx_snapshot_report ON analysis_snapshots(report_name);
