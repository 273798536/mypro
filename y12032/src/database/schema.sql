-- 标注员表
CREATE TABLE IF NOT EXISTS annotators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT,
    base_price REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 任务记录表
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_no TEXT UNIQUE NOT NULL,
    annotator_id INTEGER NOT NULL,
    task_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    batch_no TEXT,
    task_date TEXT NOT NULL,
    status TEXT DEFAULT 'submitted',
    remark TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (annotator_id) REFERENCES annotators(id)
);

-- 质检结果表
CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    inspector TEXT NOT NULL,
    pass_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    accuracy REAL,
    status TEXT DEFAULT 'pending',
    inspection_date TEXT,
    remark TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 返工单表
CREATE TABLE IF NOT EXISTS reworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    rework_no TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    rework_count INTEGER NOT NULL,
    handler_id INTEGER,
    status TEXT DEFAULT 'pending',
    original_result TEXT,
    corrected_result TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (handler_id) REFERENCES annotators(id)
);

-- 扣罚记录表
CREATE TABLE IF NOT EXISTS penalties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotator_id INTEGER NOT NULL,
    task_id INTEGER,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    penalty_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (annotator_id) REFERENCES annotators(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 补贴记录表
CREATE TABLE IF NOT EXISTS subsidies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotator_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    subsidy_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (annotator_id) REFERENCES annotators(id)
);

-- 工资汇总表
CREATE TABLE IF NOT EXISTS salary_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annotator_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    base_salary REAL DEFAULT 0,
    piece_salary REAL DEFAULT 0,
    total_penalty REAL DEFAULT 0,
    total_subsidy REAL DEFAULT 0,
    final_salary REAL DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (annotator_id) REFERENCES annotators(id),
    UNIQUE(annotator_id, month)
);
