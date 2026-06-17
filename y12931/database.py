import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "balancer.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0',
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        imported_by TEXT DEFAULT 'system',
        remark TEXT,
        UNIQUE(name, version)
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        text_content TEXT NOT NULL,
        language TEXT,
        label TEXT,
        source TEXT,
        confidence REAL DEFAULT 1.0,
        original_row INTEGER,
        is_flagged INTEGER DEFAULT 0,
        flags_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS sample_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT DEFAULT 'user',
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        before_json TEXT,
        after_json TEXT,
        operator TEXT DEFAULT 'user',
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS safety_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_code TEXT UNIQUE NOT NULL,
        rule_name TEXT NOT NULL,
        description TEXT,
        rule_type TEXT NOT NULL,
        config_json TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS balance_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        run_name TEXT,
        params_json TEXT,
        rules_version TEXT,
        result_json TEXT,
        status TEXT DEFAULT 'completed',
        run_by TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS grayscale_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        baseline_run_id INTEGER,
        candidate_run_id INTEGER,
        compare_json TEXT,
        judgment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (baseline_run_id) REFERENCES balance_runs(id),
        FOREIGN KEY (candidate_run_id) REFERENCES balance_runs(id)
    )""")

    conn.commit()

    _init_default_rules(conn)

    conn.close()


def _init_default_rules(conn):
    c = conn.cursor()
    default_rules = [
        ("LANG_COVERAGE", "多语言覆盖度检测", "检查各语言样本数量是否达标，防止某语言占比过高或过低", "language", json.dumps({
            "min_per_lang": 5,
            "max_ratio": 0.4,
            "required_langs": ["zh", "en", "ja", "ko", "es"]
        }, ensure_ascii=False)),
        ("LABEL_DISTRIBUTION", "标签分布均衡", "检查各标签类别数量分布是否均衡，避免极端偏斜", "label", json.dumps({
            "tolerance": 0.2
        }, ensure_ascii=False)),
        ("QUALITY_THRESHOLD", "样本质量阈值", "过滤置信度过低或内容异常的样本", "quality", json.dumps({
            "min_confidence": 0.3,
            "min_text_len": 2,
            "max_text_len": 5000
        }, ensure_ascii=False)),
        ("DUPLICATE_CHECK", "重复样本检测", "检测高度相似或重复的文本内容", "duplicate", json.dumps({
            "similarity_threshold": 0.95
        }, ensure_ascii=False)),
        ("SOURCE_DIVERSITY", "来源多样性", "确保样本来源渠道多样，避免单一来源主导", "source", json.dumps({
            "max_source_ratio": 0.5
        }, ensure_ascii=False)),
        ("CONFLICT_LABEL", "标签冲突检测", "检测相似文本被标注不同标签的冲突样本", "conflict", json.dumps({
            "similarity_threshold": 0.85
        }, ensure_ascii=False)),
    ]

    for code, name, desc, rtype, cfg in default_rules:
        c.execute("SELECT id FROM safety_rules WHERE rule_code = ?", (code,))
        if c.fetchone() is None:
            c.execute("""INSERT INTO safety_rules
                (rule_code, rule_name, description, rule_type, config_json)
                VALUES (?, ?, ?, ?, ?)""",
                (code, name, desc, rtype, cfg))
    conn.commit()


def log_action(action_type: str, target_type: Optional[str] = None,
               target_id: Optional[int] = None,
               before: Any = None, after: Any = None,
               operator: str = "user",
               remark: Optional[str] = None):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""INSERT INTO audit_logs
        (action_type, target_type, target_id, before_json, after_json, operator, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)""", (
        action_type, target_type, target_id,
        json.dumps(before, ensure_ascii=False) if before is not None else None,
        json.dumps(after, ensure_ascii=False) if after is not None else None,
        operator, remark
    ))
    conn.commit()
    log_id = c.lastrowid
    conn.close()
    return log_id


def get_audit_logs(limit: int = 100, action_type: Optional[str] = None) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    if action_type:
        c.execute("""SELECT * FROM audit_logs
            WHERE action_type = ? ORDER BY created_at DESC LIMIT ?""", (action_type, limit))
    else:
        c.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_dataset(name: str, version: str = "1.0",
                 imported_by: str = "user",
                 remark: Optional[str] = None) -> int:
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute("""INSERT INTO datasets (name, version, imported_by, remark)
            VALUES (?, ?, ?, ?)""", (name, version, imported_by, remark))
        conn.commit()
        did = c.lastrowid
        conn.close()
        log_action("DATASET_IMPORT", "datasets", did,
                    after={"name": name, "version": version, "remark": remark},
                    remark=f"导入数据集: {name} v{version}")
        return did
    except sqlite3.IntegrityError:
        conn.close()
        c = get_conn().cursor()
        c.execute("SELECT id FROM datasets WHERE name=? AND version=?", (name, version))
        row = c.fetchone()
        conn.close()
        return row["id"] if row else None


def insert_samples(dataset_id: int, samples: List[Dict]) -> int:
    conn = get_conn()
    c = conn.cursor()
    count = 0
    for i, s in enumerate(samples):
        c.execute("""INSERT INTO samples
            (dataset_id, text_content, language, label, source,
             confidence, original_row, is_flagged, flags_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
            dataset_id,
            s.get("text_content", ""),
            s.get("language"),
            s.get("label"),
            s.get("source"),
            s.get("confidence", 1.0),
            s.get("original_row", i),
            0,
            None
        ))
        count += 1
    conn.commit()
    conn.close()
    log_action("SAMPLES_INSERT", "datasets", dataset_id,
                after={"count": count},
                remark=f"插入样本 {count} 条到数据集 {dataset_id}")
    return count


def get_dataset_samples(dataset_id: int) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM samples WHERE dataset_id = ? ORDER BY id", (dataset_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_sample(sample_id: int, field_name: str, new_value: Any,
                 changed_by: str = "user", reason: Optional[str] = None):
    conn = get_conn()
    c = conn.cursor()
    c.execute(f"SELECT {field_name} FROM samples WHERE id = ?", (sample_id,))
    row = c.fetchone()
    old_value = row[field_name] if row else None

    c.execute(f"UPDATE samples SET {field_name} = ?, modified_at = ? WHERE id = ?",
              (new_value, datetime.now().isoformat(), sample_id))
    conn.commit()
    conn.close()

    conn = get_conn()
    c = conn.cursor()
    c.execute("""INSERT INTO sample_versions
        (sample_id, field_name, old_value, new_value, changed_by, reason)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (sample_id, field_name,
         str(old_value) if old_value is not None else None,
         str(new_value) if new_value is not None else None,
         changed_by, reason))
    conn.commit()
    conn.close()

    log_action("SAMPLE_MODIFY", "samples", sample_id,
                before={field_name: old_value},
                after={field_name: new_value},
                remark=f"修改样本 {sample_id} 的 {field_name}: {old_value} -> {new_value}")


def get_sample_history(sample_id: int) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM sample_versions WHERE sample_id = ? ORDER BY changed_at DESC",
                (sample_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def list_datasets() -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM datasets ORDER BY imported_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_dataset(dataset_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_active_rules() -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM safety_rules WHERE is_active = 1 ORDER BY id")
    rows = c.fetchall()
    conn.close()
    rules = []
    for r in rows:
        rd = dict(r)
        if rd.get("config_json"):
            rd["config"] = json.loads(rd["config_json"])
        rules.append(rd)
    return rules


def save_balance_run(dataset_id: int, run_name: Optional[str],
                      params: Dict, rules_version: str,
                      result: Dict) -> int:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""INSERT INTO balance_runs
        (dataset_id, run_name, params_json, rules_version, result_json)
        VALUES (?, ?, ?, ?, ?)""", (
        dataset_id, run_name,
        json.dumps(params, ensure_ascii=False),
        rules_version,
        json.dumps(result, ensure_ascii=False)
    ))
    conn.commit()
    rid = c.lastrowid
    conn.close()
    log_action("BALANCE_RUN", "balance_runs", rid,
                after={"run_name": run_name, "dataset_id": dataset_id},
                remark=f"执行样本平衡: {run_name}")
    return rid


def get_balance_runs(dataset_id: Optional[int] = None) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    if dataset_id:
        c.execute("SELECT * FROM balance_runs WHERE dataset_id = ? ORDER BY created_at DESC",
                    (dataset_id,))
    else:
        c.execute("SELECT * FROM balance_runs ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    runs = []
    for r in rows:
        rd = dict(r)
        for k in ("params_json", "result_json"):
            if rd.get(k):
                rd[k.replace("_json", "")] = json.loads(rd[k])
        runs.append(rd)
    return runs


def get_balance_run(run_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM balance_runs WHERE id = ?", (run_id,))
    row = c.fetchone()
    conn.close()
    if row:
        rd = dict(row)
        for k in ("params_json", "result_json"):
            if rd.get(k):
                rd[k.replace("_json", "")] = json.loads(rd[k])
        return rd
    return None


def save_grayscale_compare(baseline_id: int, candidate_id: int,
                           compare: Dict, judgment: str) -> int:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""INSERT INTO grayscale_runs
        (baseline_run_id, candidate_run_id, compare_json, judgment)
        VALUES (?, ?, ?, ?)""", (
        baseline_id, candidate_id,
        json.dumps(compare, ensure_ascii=False),
        judgment
    ))
    conn.commit()
    gid = c.lastrowid
    conn.close()
    log_action("GRAYSCALE_COMPARE", "grayscale_runs", gid,
                 after={"baseline": baseline_id, "candidate": candidate_id,
                        "judgment": judgment},
                 remark=f"灰度对比: 基线#{baseline_id} vs 候选#{candidate_id}")
    return gid


init_db()
