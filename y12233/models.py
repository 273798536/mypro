import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum


class NodeStatus(Enum):
    NOT_STARTED = "未开始"
    IN_PROGRESS = "进行中"
    PENDING_REVIEW = "待复核"
    DELAYED = "已延期"
    COMPLETED = "已完成"
    ISSUE_FOUND = "发现问题"


class PaymentStatus(Enum):
    NOT_DUE = "未到期"
    PENDING = "待支付"
    PARTIAL = "部分支付"
    PAID = "已支付"
    ON_HOLD = "冻结"


class IssueType(Enum):
    MISSING_FIELD = "字段缺失"
    LATE_SUBMISSION = "晚补材料"
    UNAUTHORIZED_CHANGE = "变更未批"
    MISSING_PHOTOS = "照片缺失"
    REMARK_MODIFIED = "备注修改"
    NODE_DELAYED = "节点延期"


@dataclass
class ProjectContract:
    id: Optional[int]
    project_code: str
    project_name: str
    client_name: str
    contractor: str
    contract_amount: float
    sign_date: str
    start_date: str
    end_date: str
    payment_terms: str
    created_at: str
    updated_at: str


@dataclass
class ConstructionNode:
    id: Optional[int]
    project_code: str
    node_code: str
    node_name: str
    planned_date: str
    actual_date: Optional[str]
    status: str
    payment_ratio: float
    payment_amount: float
    payment_status: str
    design_change: str
    change_approved: bool
    photos_submitted: bool
    photos_count: int
    remarks: str
    remark_history: str
    created_at: str
    updated_at: str


@dataclass
class IssueRecord:
    id: Optional[int]
    project_code: str
    node_code: str
    issue_type: str
    description: str
    severity: str
    status: str
    detected_at: str
    resolved_at: Optional[str]
    resolution: Optional[str]


@dataclass
class AuditLog:
    id: Optional[int]
    project_code: str
    node_code: Optional[str]
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    operator: str
    timestamp: str


class Database:
    def __init__(self, db_path: str = "exhibition_payment.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS project_contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_code TEXT UNIQUE NOT NULL,
                project_name TEXT NOT NULL,
                client_name TEXT NOT NULL,
                contractor TEXT NOT NULL,
                contract_amount REAL NOT NULL,
                sign_date TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                payment_terms TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS construction_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_code TEXT NOT NULL,
                node_code TEXT NOT NULL,
                node_name TEXT NOT NULL,
                planned_date TEXT NOT NULL,
                actual_date TEXT,
                status TEXT NOT NULL,
                payment_ratio REAL NOT NULL,
                payment_amount REAL NOT NULL,
                payment_status TEXT NOT NULL,
                design_change TEXT,
                change_approved INTEGER DEFAULT 0,
                photos_submitted INTEGER DEFAULT 0,
                photos_count INTEGER DEFAULT 0,
                remarks TEXT,
                remark_history TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(project_code, node_code)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS issue_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_code TEXT NOT NULL,
                node_code TEXT NOT NULL,
                issue_type TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                resolved_at TEXT,
                resolution TEXT,
                UNIQUE(project_code, node_code, issue_type, detected_at)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_code TEXT NOT NULL,
                node_code TEXT,
                action TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                operator TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        ''')

        conn.commit()
        conn.close()

    def insert_contract(self, contract: ProjectContract) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO project_contracts 
            (project_code, project_name, client_name, contractor, contract_amount,
             sign_date, start_date, end_date, payment_terms, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            contract.project_code, contract.project_name, contract.client_name,
            contract.contractor, contract.contract_amount, contract.sign_date,
            contract.start_date, contract.end_date, contract.payment_terms,
            contract.created_at, contract.updated_at
        ))
        contract_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return contract_id

    def insert_node(self, node: ConstructionNode) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, remark_history FROM construction_nodes 
            WHERE project_code = ? AND node_code = ?
        ''', (node.project_code, node.node_code))
        existing = cursor.fetchone()
        
        if existing and node.remarks:
            old_history = json.loads(existing['remark_history'] or '[]')
            new_history = old_history + [{
                'timestamp': datetime.now().isoformat(),
                'remark': node.remarks
            }]
            node.remark_history = json.dumps(new_history, ensure_ascii=False)
        
        cursor.execute('''
            INSERT OR REPLACE INTO construction_nodes 
            (project_code, node_code, node_name, planned_date, actual_date, status,
             payment_ratio, payment_amount, payment_status, design_change, 
             change_approved, photos_submitted, photos_count, remarks, remark_history,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            node.project_code, node.node_code, node.node_name, node.planned_date,
            node.actual_date, node.status, node.payment_ratio, node.payment_amount,
            node.payment_status, node.design_change, 1 if node.change_approved else 0,
            1 if node.photos_submitted else 0, node.photos_count, node.remarks,
            node.remark_history, node.created_at, node.updated_at
        ))
        node_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return node_id

    def insert_issue(self, issue: IssueRecord) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO issue_records 
                (project_code, node_code, issue_type, description, severity, 
                 status, detected_at, resolved_at, resolution)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                issue.project_code, issue.node_code, issue.issue_type,
                issue.description, issue.severity, issue.status,
                issue.detected_at, issue.resolved_at, issue.resolution
            ))
            issue_id = cursor.lastrowid
            conn.commit()
        except sqlite3.IntegrityError:
            issue_id = 0
        conn.close()
        return issue_id

    def insert_audit_log(self, log: AuditLog) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO audit_logs 
            (project_code, node_code, action, old_value, new_value, operator, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            log.project_code, log.node_code, log.action, log.old_value,
            log.new_value, log.operator, log.timestamp
        ))
        log_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return log_id

    def get_contract(self, project_code: str) -> Optional[ProjectContract]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM project_contracts WHERE project_code = ?', (project_code,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return ProjectContract(**dict(row))
        return None

    def get_nodes_by_project(self, project_code: str) -> List[ConstructionNode]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM construction_nodes WHERE project_code = ?', (project_code,))
        rows = cursor.fetchall()
        conn.close()
        return [ConstructionNode(**dict(row)) for row in rows]

    def get_issues_by_project(self, project_code: str, status: str = None) -> List[IssueRecord]:
        conn = self._get_conn()
        cursor = conn.cursor()
        if status:
            cursor.execute('SELECT * FROM issue_records WHERE project_code = ? AND status = ? ORDER BY detected_at DESC', 
                         (project_code, status))
        else:
            cursor.execute('SELECT * FROM issue_records WHERE project_code = ? ORDER BY detected_at DESC', 
                         (project_code,))
        rows = cursor.fetchall()
        conn.close()
        return [IssueRecord(**dict(row)) for row in rows]

    def get_all_issues(self) -> List[IssueRecord]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM issue_records ORDER BY detected_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return [IssueRecord(**dict(row)) for row in rows]

    def get_audit_logs(self, project_code: str = None) -> List[AuditLog]:
        conn = self._get_conn()
        cursor = conn.cursor()
        if project_code:
            cursor.execute('SELECT * FROM audit_logs WHERE project_code = ? ORDER BY timestamp DESC', 
                         (project_code,))
        else:
            cursor.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        conn.close()
        return [AuditLog(**dict(row)) for row in rows]

    def update_issue_status(self, issue_id: int, status: str, resolution: str = None):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE issue_records 
            SET status = ?, resolved_at = ?, resolution = ?
            WHERE id = ?
        ''', (status, datetime.now().isoformat(), resolution, issue_id))
        conn.commit()
        conn.close()
