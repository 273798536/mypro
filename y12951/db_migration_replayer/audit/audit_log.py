"""审计日志。

记录所有重要变更：谁改的、什么时候改的、为什么改。
特别是分页顺序不稳定的复核通过记录。
"""
from typing import List, Optional

from ..config import get_config
from ..metadb import get_conn, now_iso


class AuditLogger:
    """审计日志记录器。"""

    def __init__(self):
        self.operator = get_config().operator

    def record(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        old_value: str = "",
        new_value: str = "",
        reason: str = "",
    ) -> int:
        """记录一条审计日志。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO audit_logs
                (entity_type, entity_id, action, old_value, new_value, reason, operator, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entity_type,
                    entity_id,
                    action,
                    old_value,
                    new_value,
                    reason,
                    self.operator,
                    now_iso(),
                ),
            )
            return cur.lastrowid

    def list(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """查询审计日志。"""
        with get_conn() as conn:
            cur = conn.cursor()
            query = "SELECT * FROM audit_logs WHERE 1=1"
            params = []

            if entity_type:
                query += " AND entity_type = ?"
                params.append(entity_type)
            if entity_id:
                query += " AND entity_id = ?"
                params.append(entity_id)
            if action:
                query += " AND action = ?"
                params.append(action)

            query += " ORDER BY id DESC LIMIT ?"
            params.append(limit)

            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]

    def review_page_order(
        self,
        migration_name: str,
        approved: bool,
        reason: str = "",
    ) -> dict:
        """复核分页顺序不稳定的问题。

        如果复核通过（approved=True），记录到迁移状态中，
        并留下完整审计轨迹：谁改的、什么时候改的、为什么改。
        """
        old_value = "stable"
        new_value = "reviewed_unstable" if approved else "stable"

        with get_conn() as conn:
            cur = conn.cursor()

            cur.execute(
                "SELECT page_order_unstable, page_order_reviewed_by FROM migration_status WHERE migration_name = ?",
                (migration_name,),
            )
            row = cur.fetchone()

            old_value = "unstable" if row and row["page_order_unstable"] else "stable"

            if row is None:
                cur.execute(
                    """
                    INSERT INTO migration_status
                    (migration_name, current_status, page_order_unstable,
                     page_order_reviewed_by, page_order_reviewed_at, page_order_review_reason)
                    VALUES (?, 'pending', ?, ?, ?, ?)
                    """,
                    (
                        migration_name,
                        1 if approved else 0,
                        self.operator if approved else None,
                        now_iso() if approved else None,
                        reason if approved else "",
                    ),
                )
            else:
                cur.execute(
                    """
                    UPDATE migration_status
                    SET page_order_unstable = ?,
                        page_order_reviewed_by = ?,
                        page_order_reviewed_at = ?,
                        page_order_review_reason = ?
                    WHERE migration_name = ?
                    """,
                    (
                        1 if approved else 0,
                        self.operator if approved else None,
                        now_iso() if approved else None,
                        reason if approved else "",
                        migration_name,
                    ),
                )

        self.record(
            entity_type="migration",
            entity_id=migration_name,
            action="page_order_review",
            old_value=old_value,
            new_value=new_value,
            reason=reason,
        )

        return {
            "migration_name": migration_name,
            "approved": approved,
            "reviewed_by": self.operator,
            "reviewed_at": now_iso(),
            "reason": reason,
        }

    def get_page_order_review_history(self, migration_name: str) -> List[dict]:
        """获取某个迁移的分页顺序复核历史。"""
        return self.list(
            entity_type="migration",
            entity_id=migration_name,
            action="page_order_review",
        )


def record_audit(
    entity_type: str,
    entity_id: str,
    action: str,
    old_value: str = "",
    new_value: str = "",
    reason: str = "",
    operator: Optional[str] = None,
) -> int:
    """快捷函数：记录审计日志。"""
    logger = AuditLogger()
    if operator:
        logger.operator = operator
    return logger.record(entity_type, entity_id, action, old_value, new_value, reason)


def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
) -> List[dict]:
    """快捷函数：列出审计日志。"""
    return AuditLogger().list(entity_type, entity_id, action, limit)


def review_page_order(
    migration_name: str,
    approved: bool,
    reason: str = "",
) -> dict:
    """快捷函数：复核分页顺序。"""
    return AuditLogger().review_page_order(migration_name, approved, reason)


def get_page_order_review_history(migration_name: str) -> List[dict]:
    """快捷函数：获取分页顺序复核历史。"""
    return AuditLogger().get_page_order_review_history(migration_name)
