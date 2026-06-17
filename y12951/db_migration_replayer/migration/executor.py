"""迁移执行引擎。

支持：
- 从目录读取 SQL 迁移脚本
- 幂等执行（同一批材料重复跑不会越跑越乱）
- 批次号管理
- 执行状态记录
"""
import os
import sqlite3
import uuid
import time
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass

from ..config import get_config
from ..metadb import get_conn, now_iso


@dataclass
class MigrationScript:
    """迁移脚本。"""

    name: str
    path: str
    sql: str


@dataclass
class MigrationRunResult:
    """单次迁移执行结果。"""

    migration_name: str
    status: str  # success, skipped, failed, pending
    started_at: str
    finished_at: Optional[str] = None
    duration_ms: int = 0
    error_message: Optional[str] = None
    skipped_reason: Optional[str] = None


class MigrationExecutor:
    """迁移执行器。"""

    def __init__(self, target_db_path: str, input_dir: Optional[str] = None):
        cfg = get_config()
        self.target_db_path = target_db_path
        self.input_dir = input_dir or cfg.input_dir
        self.batch_id = ""
        self.operator = cfg.operator

    def discover_migrations(self) -> List[MigrationScript]:
        """发现输入目录下的所有迁移脚本（按文件名排序）。"""
        if not os.path.isdir(self.input_dir):
            return []

        scripts = []
        for fname in sorted(os.listdir(self.input_dir)):
            if fname.endswith(".sql"):
                fpath = os.path.join(self.input_dir, fname)
                with open(fpath, "r", encoding="utf-8") as f:
                    sql = f.read()
                name = fname[:-4]  # 去掉 .sql
                scripts.append(MigrationScript(name=name, path=fpath, sql=sql))
        return scripts

    def _is_already_success(self, migration_name: str, batch_id: str) -> bool:
        """检查同一批次下是否已成功执行过。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT status FROM migration_runs
                WHERE migration_name = ? AND batch_id = ?
                ORDER BY id DESC LIMIT 1
                """,
                (migration_name, batch_id),
            )
            row = cur.fetchone()
            return row is not None and row["status"] == "success"

    def _record_start(self, migration_name: str, batch_id: str) -> int:
        """记录开始执行。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO migration_runs
                (migration_name, batch_id, status, started_at, created_by)
                VALUES (?, ?, 'running', ?, ?)
                """,
                (migration_name, batch_id, now_iso(), self.operator),
            )
            return cur.lastrowid

    def _record_finish(
        self,
        run_id: int,
        migration_name: str,
        status: str,
        started_at: str,
        error: Optional[str] = None,
    ):
        """记录执行完成，并更新迁移状态表。"""
        finished = now_iso()
        start_dt = datetime.fromisoformat(started_at)
        end_dt = datetime.fromisoformat(finished)
        duration_ms = int((end_dt - start_dt).total_seconds() * 1000)

        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE migration_runs
                SET status = ?, finished_at = ?, duration_ms = ?, error_message = ?
                WHERE id = ?
                """,
                (status, finished, duration_ms, error, run_id),
            )

            cur.execute(
                "SELECT current_status, slow_query_cause FROM migration_status WHERE migration_name = ?",
                (migration_name,),
            )
            row = cur.fetchone()

            if row is None:
                cur.execute(
                    """
                    INSERT INTO migration_status
                    (migration_name, current_status, last_run_id)
                    VALUES (?, ?, ?)
                    """,
                    (migration_name, status, run_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE migration_status
                    SET current_status = ?, last_run_id = ?
                    WHERE migration_name = ?
                    """,
                    (status, run_id, migration_name),
                )

    def execute_batch(
        self, batch_id: Optional[str] = None
    ) -> List[MigrationRunResult]:
        """执行一批迁移。

        幂等保证：同一 batch_id 下已成功的迁移会被跳过。
        如果不传 batch_id，自动生成一个新的。
        """
        if batch_id is None:
            batch_id = f"batch_{uuid.uuid4().hex[:8]}"
        self.batch_id = batch_id

        scripts = self.discover_migrations()
        results = []

        for script in scripts:
            result = self._execute_one(script, batch_id)
            results.append(result)

        return results

    def _execute_one(
        self, script: MigrationScript, batch_id: str
    ) -> MigrationRunResult:
        """执行单个迁移脚本。"""
        started_at = now_iso()

        if self._is_already_success(script.name, batch_id):
            result = MigrationRunResult(
                migration_name=script.name,
                status="skipped",
                started_at=started_at,
                finished_at=started_at,
                skipped_reason="same batch already succeeded",
            )
            return result

        run_id = self._record_start(script.name, batch_id)

        try:
            conn = sqlite3.connect(self.target_db_path)
            try:
                conn.executescript(script.sql)
                conn.commit()
            finally:
                conn.close()

            status = "success"
            error_msg = None
        except Exception as e:
            status = "failed"
            error_msg = str(e)

        finished_at = now_iso()
        self._record_finish(run_id, script.name, status, started_at, error_msg)

        start_dt = datetime.fromisoformat(started_at)
        end_dt = datetime.fromisoformat(finished_at)
        duration_ms = int((end_dt - start_dt).total_seconds() * 1000)

        return MigrationRunResult(
            migration_name=script.name,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
            error_message=error_msg,
        )

    def rerun_failed(self, batch_id: str) -> List[MigrationRunResult]:
        """重跑指定批次中失败的迁移。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT DISTINCT migration_name FROM migration_runs
                WHERE batch_id = ? AND status = 'failed'
                AND migration_name NOT IN (
                    SELECT migration_name FROM migration_runs
                    WHERE batch_id = ? AND status = 'success'
                )
                """,
                (batch_id, batch_id),
            )
            failed_names = [row["migration_name"] for row in cur.fetchall()]

        scripts = self.discover_migrations()
        script_map = {s.name: s for s in scripts}

        results = []
        for name in failed_names:
            if name in script_map:
                results.append(self._execute_one(script_map[name], batch_id))

        return results


def execute_migrations(
    target_db_path: str,
    input_dir: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> List[MigrationRunResult]:
    """快捷函数：执行一批迁移。"""
    executor = MigrationExecutor(target_db_path, input_dir)
    return executor.execute_batch(batch_id)


def execute_batch(
    target_db_path: str,
    batch_id: str,
    input_dir: Optional[str] = None,
) -> List[MigrationRunResult]:
    """快捷函数：按 batch_id 执行（幂等）。"""
    executor = MigrationExecutor(target_db_path, input_dir)
    return executor.execute_batch(batch_id)
