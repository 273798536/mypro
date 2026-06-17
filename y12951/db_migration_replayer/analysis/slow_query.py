"""慢查询归因分析。

当慢查询归因判断改变时，迁移状态里要能看到前后差别。
记录旧值、新值、修改人、修改时间、修改原因。
"""
from typing import List, Optional, Dict

from ..config import get_config
from ..metadb import get_conn, now_iso
from ..audit.audit_log import record_audit


class SlowQueryAnalyzer:
    """慢查询归因分析器。"""

    COMMON_CAUSES = [
        "缺少索引",
        "全表扫描",
        "锁等待",
        "数据量过大",
        "连接池耗尽",
        "排序/分页未优化",
        "关联查询未走索引",
        "IO 瓶颈",
    ]

    def __init__(self):
        self.operator = get_config().operator

    def set_cause(
        self,
        migration_name: str,
        cause: str,
        reason: str = "",
    ) -> dict:
        """设置慢查询归因，并记录变更历史。"""
        old_cause = None
        changed = False

        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT slow_query_cause, previous_slow_query_cause
                FROM migration_status
                WHERE migration_name = ?
                """,
                (migration_name,),
            )
            row = cur.fetchone()

            if row:
                old_cause = row["slow_query_cause"]

            if old_cause == cause:
                return {"changed": False, "old_cause": old_cause, "new_cause": cause}

            changed = True
            if row is None:
                cur.execute(
                    """
                    INSERT INTO migration_status
                    (migration_name, current_status, slow_query_cause,
                     slow_query_cause_changed_at, slow_query_cause_changed_by)
                    VALUES (?, 'pending', ?, ?, ?)
                    """,
                    (migration_name, cause, now_iso(), self.operator),
                )
            else:
                cur.execute(
                    """
                    UPDATE migration_status
                    SET slow_query_cause = ?,
                        previous_slow_query_cause = ?,
                        slow_query_cause_changed_at = ?,
                        slow_query_cause_changed_by = ?
                    WHERE migration_name = ?
                    """,
                    (cause, old_cause, now_iso(), self.operator, migration_name),
                )

        if changed:
            record_audit(
                entity_type="migration",
                entity_id=migration_name,
                action="slow_query_cause_changed",
                old_value=old_cause or "",
                new_value=cause,
                reason=reason,
                operator=self.operator,
            )

        return {
            "changed": True,
            "old_cause": old_cause,
            "new_cause": cause,
            "changed_at": now_iso(),
            "changed_by": self.operator,
        }

    def get_status_diff(self, migration_name: str) -> Optional[dict]:
        """获取迁移状态中慢查询归因的前后差别。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT
                    migration_name,
                    current_status,
                    slow_query_cause,
                    previous_slow_query_cause,
                    slow_query_cause_changed_at,
                    slow_query_cause_changed_by
                FROM migration_status
                WHERE migration_name = ?
                """,
                (migration_name,),
            )
            row = cur.fetchone()
            if row is None:
                return None

            data = dict(row)
            data["cause_changed"] = (
                data["slow_query_cause"] != data["previous_slow_query_cause"]
                and data["previous_slow_query_cause"] is not None
            )
            return data

    def list_all_with_diff(self) -> List[dict]:
        """列出所有迁移及其慢查询归因变化。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT
                    migration_name,
                    current_status,
                    slow_query_cause,
                    previous_slow_query_cause,
                    slow_query_cause_changed_at,
                    slow_query_cause_changed_by
                FROM migration_status
                ORDER BY migration_name
                """
            )
            results = []
            for row in cur.fetchall():
                data = dict(row)
                data["cause_changed"] = (
                    data["slow_query_cause"] != data["previous_slow_query_cause"]
                    and data["previous_slow_query_cause"] is not None
                )
                results.append(data)
            return results


def set_slow_query_cause(
    migration_name: str,
    cause: str,
    reason: str = "",
) -> dict:
    """快捷函数：设置慢查询归因。"""
    return SlowQueryAnalyzer().set_cause(migration_name, cause, reason)


def get_slow_query_history(migration_name: str) -> Optional[dict]:
    """快捷函数：获取慢查询归因历史。"""
    return SlowQueryAnalyzer().get_status_diff(migration_name)
