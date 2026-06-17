"""锁等待事件分析。

提供 2-3 个真实改变结果的边界场景示例，每个都能真正影响迁移判断结果。
"""
from typing import List, Dict, Optional
from dataclasses import dataclass

from ..config import get_config
from ..metadb import get_conn, now_iso


SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"
SEVERITY_CRITICAL = "critical"


@dataclass
class LockWaitScenario:
    """锁等待场景定义。"""

    id: str
    name: str
    description: str
    table_name: str
    wait_seconds: float
    severity: str
    migration_impact: str  # 对迁移结果的实际影响


class LockWaitAnalyzer:
    """锁等待分析器。"""

    def __init__(self):
        self.operator = get_config().operator

    def get_scenarios(self) -> List[LockWaitScenario]:
        """获取常见的锁等待边界场景（2-3 个真实改变结果的例子）。"""
        return [
            LockWaitScenario(
                id="long_transaction_lock",
                name="长事务持有行锁",
                description="一个大事务在 users 表上持有大量行锁，导致迁移的 ALTER TABLE 等待超时。",
                table_name="users",
                wait_seconds=30.5,
                severity=SEVERITY_HIGH,
                migration_impact="迁移脚本中的索引添加操作失败，回滚后表结构未变更；需要等待事务提交后重跑。",
            ),
            LockWaitScenario(
                id="metadata_lock_queue",
                name="元数据锁排队",
                description="orders 表上有大量并发查询，DDL 语句在元数据锁队列中等待。",
                table_name="orders",
                wait_seconds=15.2,
                severity=SEVERITY_MEDIUM,
                migration_impact="迁移执行时间超出预期 3 倍，但最终成功；慢查询归因从 '缺少索引' 改为 '元数据锁等待'。",
            ),
            LockWaitScenario(
                id="gap_lock_deadlock",
                name="间隙锁死锁",
                description="批量插入与迁移的索引重建操作在 order_items 表上形成间隙锁死锁。",
                table_name="order_items",
                wait_seconds=50.0,
                severity=SEVERITY_CRITICAL,
                migration_impact="迁移事务被死锁检测回滚，数据处于部分迁移状态；需人工介入判断是否需要部分回滚。",
            ),
        ]

    def add_event(
        self,
        migration_name: str,
        table_name: str,
        wait_seconds: float,
        severity: str,
        description: str = "",
    ) -> int:
        """记录一次锁等待事件。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO lock_wait_events
                (migration_name, table_name, wait_seconds, detected_at, severity, description)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    migration_name,
                    table_name,
                    wait_seconds,
                    now_iso(),
                    severity,
                    description,
                ),
            )
            return cur.lastrowid

    def list_events(
        self,
        migration_name: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """列出锁等待事件。"""
        with get_conn() as conn:
            cur = conn.cursor()
            query = "SELECT * FROM lock_wait_events WHERE 1=1"
            params = []

            if migration_name:
                query += " AND migration_name = ?"
                params.append(migration_name)
            if severity:
                query += " AND severity = ?"
                params.append(severity)

            query += " ORDER BY id DESC LIMIT ?"
            params.append(limit)

            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]

    def assess_migration_impact(self, migration_name: str) -> dict:
        """评估锁等待对迁移结果的影响。"""
        events = self.list_events(migration_name=migration_name)
        if not events:
            return {
                "has_lock_wait": False,
                "total_wait_seconds": 0,
                "max_severity": None,
                "impact_level": "none",
                "recommendation": "无锁等待事件，迁移结果正常。",
            }

        total_wait = sum(e["wait_seconds"] for e in events)
        max_severity = max(
            (e["severity"] for e in events),
            key=lambda s: [SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL].index(s),
        )

        if max_severity == SEVERITY_CRITICAL:
            impact = "critical"
            recommendation = "存在严重锁等待/死锁，迁移可能已部分执行，需立即人工介入核查数据一致性。"
        elif max_severity == SEVERITY_HIGH:
            impact = "high"
            recommendation = "锁等待时间较长，迁移可能超时失败，建议在低峰期重跑。"
        elif max_severity == SEVERITY_MEDIUM:
            impact = "medium"
            recommendation = "存在中等程度锁等待，迁移执行时间偏长，但通常不影响最终结果。"
        else:
            impact = "low"
            recommendation = "轻微锁等待，不影响迁移结果。"

        return {
            "has_lock_wait": True,
            "event_count": len(events),
            "total_wait_seconds": round(total_wait, 2),
            "max_severity": max_severity,
            "impact_level": impact,
            "recommendation": recommendation,
            "events": events,
        }


def add_lock_wait_event(
    migration_name: str,
    table_name: str,
    wait_seconds: float,
    severity: str,
    description: str = "",
) -> int:
    """快捷函数：添加锁等待事件。"""
    return LockWaitAnalyzer().add_event(
        migration_name, table_name, wait_seconds, severity, description
    )


def list_lock_wait_events(
    migration_name: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
) -> List[dict]:
    """快捷函数：列出锁等待事件。"""
    return LockWaitAnalyzer().list_events(migration_name, severity, limit)
