"""迁移历史查询。"""
from typing import List, Dict, Optional

from ..metadb import get_conn


class MigrationHistory:
    """迁移历史管理器。"""

    def get_status(self, migration_name: str) -> Optional[dict]:
        """获取单个迁移的当前状态。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM migration_status WHERE migration_name = ?",
                (migration_name,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def list_all_status(self) -> List[dict]:
        """列出所有迁移的状态。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM migration_status ORDER BY migration_name"
            )
            return [dict(row) for row in cur.fetchall()]

    def list_runs(
        self,
        migration_name: Optional[str] = None,
        batch_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """列出迁移执行记录。"""
        with get_conn() as conn:
            cur = conn.cursor()
            query = "SELECT * FROM migration_runs WHERE 1=1"
            params = []

            if migration_name:
                query += " AND migration_name = ?"
                params.append(migration_name)
            if batch_id:
                query += " AND batch_id = ?"
                params.append(batch_id)

            query += " ORDER BY id DESC LIMIT ?"
            params.append(limit)

            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]

    def list_batches(self) -> List[dict]:
        """列出所有批次及摘要。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT
                    batch_id,
                    COUNT(*) as total_count,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_count,
                    MIN(started_at) as started_at,
                    MAX(finished_at) as finished_at
                FROM migration_runs
                GROUP BY batch_id
                ORDER BY started_at DESC
                """
            )
            return [dict(row) for row in cur.fetchall()]


def get_migration_status(migration_name: str) -> Optional[dict]:
    return MigrationHistory().get_status(migration_name)


def list_migration_runs(
    migration_name: Optional[str] = None,
    batch_id: Optional[str] = None,
    limit: int = 50,
) -> List[dict]:
    return MigrationHistory().list_runs(migration_name, batch_id, limit)
