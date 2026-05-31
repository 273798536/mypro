import sqlite3
import json
import os
from contextlib import contextmanager
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'drone_calculator.db')

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS calculation_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_data_packages (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('waypoint_plan', 'payload_weight', 'wind_field', 'battery', 'return_report', 'mixed')),
    content TEXT NOT NULL,
    source TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES calculation_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calculation_results (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    energy_model TEXT NOT NULL,
    return_threshold TEXT NOT NULL,
    risks TEXT NOT NULL,
    content_hash TEXT,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES calculation_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS correction_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    corrected_by TEXT NOT NULL,
    reason TEXT,
    corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES calculation_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_traces (
    id TEXT PRIMARY KEY,
    result_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('raw_data', 'calculation_step', 'correction', 'result')),
    description TEXT NOT NULL,
    value TEXT,
    source_package_id TEXT,
    correction_id TEXT,
    previous_node_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_id) REFERENCES calculation_results(id) ON DELETE CASCADE,
    FOREIGN KEY (source_package_id) REFERENCES raw_data_packages(id),
    FOREIGN KEY (correction_id) REFERENCES correction_logs(id)
);

CREATE TABLE IF NOT EXISTS content_hashes (
    hash TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    hash_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES calculation_tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON calculation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_packages_task_id ON raw_data_packages(task_id);
CREATE INDEX IF NOT EXISTS idx_results_task_id ON calculation_results(task_id);
CREATE INDEX IF NOT EXISTS idx_corrections_task_id ON correction_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_traces_result_id ON source_traces(result_id);
CREATE INDEX IF NOT EXISTS idx_hashes_task_id ON content_hashes(task_id);
"""

INIT_DATA_SQL = """
INSERT OR IGNORE INTO calculation_tasks (id, name, status) VALUES 
('task-001', '逆风突变测试任务', 'pending');

INSERT OR IGNORE INTO raw_data_packages (id, task_id, type, content, source) VALUES 
('pkg-001', 'task-001', 'mixed', 
 '{"waypoint_plan": {"waypoints": [{"lat": 31.2304, "lng": 121.4737, "altitude": 100, "speed": 15}], "totalDistance": 12.5, "estimatedDuration": 45}, "payload_weight": {"payload": 2.5, "takeoffWeight": 15.0, "emptyWeight": 12.5}, "wind_field": {"baseWindSpeed": 5, "suddenChange": {"point": 5.2, "windSpeed": 12, "windDirection": 180}}}', 
 '航测队-2024-05-15-上海区域');

INSERT OR IGNORE INTO raw_data_packages (id, task_id, type, content, source) VALUES 
('pkg-002', 'task-001', 'payload_weight',
 '{"battery": {"initialCapacity": 16000, "currentCapacity": 12800, "cycleCount": 156, "agingFactor": 0.8}}',
 '电池管理系统导出');

INSERT OR IGNORE INTO raw_data_packages (id, task_id, type, content, source) VALUES 
('pkg-003', 'task-001', 'waypoint_plan',
 '{"no_fly_zones": [{"id": "nfz-001", "center": {"lat": 31.24, "lng": 121.48}, "radius": 1000, "detourDistance": 3.2}]}',
 '民航局禁飞区数据库');
"""

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_database():
    with get_db_connection() as conn:
        conn.executescript(SCHEMA_SQL)
        conn.executescript(INIT_DATA_SQL)

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(zip(row.keys(), row))

def rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(row) for row in rows]
