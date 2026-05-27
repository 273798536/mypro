import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'private_placement.db')

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_type TEXT DEFAULT '身份证',
    id_number TEXT,
    investor_type TEXT DEFAULT '自然人',
    contact TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    risk_level INTEGER NOT NULL,
    risk_label TEXT,
    status TEXT DEFAULT '在售',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level INTEGER NOT NULL,
    risk_label TEXT,
    assessment_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    source TEXT DEFAULT '线上测评',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supporting_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL,
    doc_name TEXT,
    doc_desc TEXT,
    source TEXT,
    verified INTEGER DEFAULT 0,
    verified_by TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cooling_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT '进行中',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suitability_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    match_level TEXT NOT NULL,
    assessment_id INTEGER,
    risk_match INTEGER DEFAULT 0,
    docs_complete INTEGER DEFAULT 0,
    cooling_ok INTEGER DEFAULT 0,
    overall_result TEXT DEFAULT '待处理',
    issues TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES risk_assessments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS review_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    action_desc TEXT,
    operator TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES suitability_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    field TEXT NOT NULL,
    reason TEXT,
    corrected_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES suitability_reports(id) ON DELETE CASCADE
);
"""

SAMPLE_DATA = {
    'investors': [
        ('张三', '身份证', '310101199001011234', '自然人', '上海市浦东新区', '13800138001'),
        ('李四', '身份证', '310101198505051234', '自然人', '北京市朝阳区', '13900139001'),
        ('王五投资合伙企业', '统一社会信用代码', '91310000MA1K3XXXXX', '机构', '深圳市南山区', '13700137001'),
    ],
    'products': [
        ('PRD001', '稳健优选1号', 2, 'R2-中低风险'),
        ('PRD002', '成长进取2号', 3, 'R3-中风险'),
        ('PRD003', '高收益3号', 4, 'R4-中高风险'),
        ('PRD004', '对冲精选4号', 5, 'R5-高风险'),
    ],
    'risk_assessments': [
        (1, 25, 2, 'C2-稳健型', '2024-01-15 10:00:00', '2025-01-15 10:00:00', '线上测评'),
        (2, 45, 4, 'C4-进取型', '2023-06-20 14:30:00', '2024-06-20 14:30:00', '线上测评'),
        (3, 55, 5, 'C5-专业型', '2024-03-10 09:00:00', '2025-03-10 09:00:00', '线下问卷'),
    ],
    'supporting_docs': [
        (1, '身份证明', '身份证正反面.pdf', '身份证照片', '投资者上传', 1, '张经理', '2024-02-01 10:00:00'),
        (1, '资产证明', '银行流水.pdf', '近6个月银行流水', '投资者上传', 1, '张经理', '2024-02-01 10:00:00'),
        (1, '收入证明', '在职证明.pdf', '年收入50万证明', '投资者上传', 0, None, None),
        (2, '身份证明', '身份证扫描件.pdf', '身份证扫描件', '投资者上传', 1, '李经理', '2024-01-15 09:00:00'),
        (2, '资产证明', '房产证明.pdf', '房产估值证明', '投资者上传', 1, '李经理', '2024-01-15 09:00:00'),
        (2, '收入证明', '工资流水.pdf', '近12个月工资流水', '投资者上传', 1, '李经理', '2024-01-15 09:00:00'),
        (2, '投资经验', '交易记录.pdf', '股票账户交易记录', '投资者上传', 0, None, None),
        (3, '营业执照', '营业执照.pdf', '营业执照副本', '投资者上传', 1, '王经理', '2024-03-15 11:00:00'),
        (3, '资产证明', '审计报告.pdf', '年度审计报告', '投资者上传', 1, '王经理', '2024-03-15 11:00:00'),
    ],
    'cooling_periods': [
        (1, 1, '2024-05-01 09:00:00', '2024-05-23 09:00:00', '已完成'),
        (1, 2, '2024-05-10 10:00:00', '2024-06-01 10:00:00', '已完成'),
        (2, 3, '2026-05-20 14:00:00', '2026-06-11 14:00:00', '进行中'),
        (3, 4, '2026-05-25 09:30:00', '2026-06-16 09:30:00', '进行中'),
    ],
}


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
    print("数据库初始化完成")


def seed_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM investors")
    if cursor.fetchone()[0] > 0:
        conn.close()
        print("已有数据，跳过示例数据填充")
        return

    cursor.execute("DELETE FROM corrections")
    cursor.execute("DELETE FROM review_history")
    cursor.execute("DELETE FROM suitability_reports")
    cursor.execute("DELETE FROM cooling_periods")
    cursor.execute("DELETE FROM supporting_docs")
    cursor.execute("DELETE FROM risk_assessments")
    cursor.execute("DELETE FROM products")
    cursor.execute("DELETE FROM investors")

    for row in SAMPLE_DATA['investors']:
        cursor.execute(
            "INSERT INTO investors (name, id_type, id_number, investor_type, contact, phone) VALUES (?,?,?,?,?,?)",
            row
        )

    for row in SAMPLE_DATA['products']:
        cursor.execute(
            "INSERT INTO products (product_code, product_name, risk_level, risk_label) VALUES (?,?,?,?)",
            row
        )

    for row in SAMPLE_DATA['risk_assessments']:
        cursor.execute(
            "INSERT INTO risk_assessments (investor_id, risk_score, risk_level, risk_label, assessment_date, expiry_date, source) VALUES (?,?,?,?,?,?,?)",
            row
        )

    for row in SAMPLE_DATA['supporting_docs']:
        cursor.execute(
            "INSERT INTO supporting_docs (investor_id, doc_type, doc_name, doc_desc, source, verified, verified_by, verified_at) VALUES (?,?,?,?,?,?,?,?)",
            row
        )

    for row in SAMPLE_DATA['cooling_periods']:
        cursor.execute(
            "INSERT INTO cooling_periods (investor_id, product_id, start_date, end_date, status) VALUES (?,?,?,?,?)",
            row
        )

    conn.commit()
    conn.close()
    print("示例数据填充完成")


if __name__ == '__main__':
    init_db()
    seed_data()
