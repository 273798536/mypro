import json
from .database import get_db_cursor
from .constants import (
    STATUS_REVIEWING,
    STATUS_PENDING,
    STATUS_FAILED,
    ERROR_RUN_ID_DUPLICATE,
    ERROR_RUN_NOT_FOUND,
    ERROR_SNAPSHOT_EMPTY,
    ERROR_MESSAGES,
)


class NegSampleTracker:
    def __init__(self, db_path=None):
        self.db_path = db_path

    def create_run(self, run_id, model_version=None, data_source=None,
                   raw_snapshot_path=None):
        """
        创建一条负采样运行记录。
        如果 run_id 已存在，标记为 pending 待确认，不覆盖旧数据。
        """
        with get_db_cursor(self.db_path) as conn:
            existing = conn.execute(
                "SELECT id, status FROM runs WHERE run_id = ?",
                (run_id,)
            ).fetchone()

            if existing:
                conn.execute(
                    """
                    INSERT INTO run_conflicts (run_id, conflict_type, conflict_detail)
                    VALUES (?, 'duplicate_run_id', ?)
                    """,
                    (run_id, f"运行编号 {run_id} 已存在，新提交已挂起")
                )
                conn.execute(
                    """
                    UPDATE runs SET status = ?, status_reason = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = ?
                    """,
                    (STATUS_PENDING, ERROR_MESSAGES[ERROR_RUN_ID_DUPLICATE], run_id)
                )
                return {
                    "run_id": run_id,
                    "status": STATUS_PENDING,
                    "is_duplicate": True,
                    "error_code": ERROR_RUN_ID_DUPLICATE,
                    "error_message": ERROR_MESSAGES[ERROR_RUN_ID_DUPLICATE],
                }

            conn.execute(
                """
                INSERT INTO runs (run_id, model_version, data_source,
                                  raw_snapshot_path, status, status_reason)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (run_id, model_version, data_source,
                 raw_snapshot_path, STATUS_REVIEWING, "")
            )
            return {
                "run_id": run_id,
                "status": STATUS_REVIEWING,
                "is_duplicate": False,
            }

    def add_feature_snapshot(self, run_id, feature_name, feature_value=None,
                             raw_value=None, data_source=None,
                             is_raw_dirty=False, snapshot_order=0):
        """
        记录一条特征快照。保留原始值（raw_value），不做清洗。
        """
        with get_db_cursor(self.db_path) as conn:
            run = conn.execute(
                "SELECT id, status FROM runs WHERE run_id = ?",
                (run_id,)
            ).fetchone()
            if not run:
                return {
                    "success": False,
                    "error_code": ERROR_RUN_NOT_FOUND,
                    "error_message": ERROR_MESSAGES[ERROR_RUN_NOT_FOUND],
                }

            conn.execute(
                """
                INSERT INTO feature_snapshots
                (run_id, feature_name, feature_value, raw_value,
                 data_source, is_raw_dirty, snapshot_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (run_id, feature_name, str(feature_value) if feature_value is not None else None,
                 str(raw_value) if raw_value is not None else None,
                 data_source, 1 if is_raw_dirty else 0, snapshot_order)
            )
            return {"success": True, "feature_name": feature_name}

    def add_feature_snapshots_batch(self, run_id, snapshots):
        """
        批量添加特征快照。
        snapshots: list of dict，每个 dict 包含 feature_name, feature_value,
                   raw_value, data_source, is_raw_dirty, snapshot_order
        """
        if not snapshots:
            return {
                "success": False,
                "error_code": ERROR_SNAPSHOT_EMPTY,
                "error_message": ERROR_MESSAGES[ERROR_SNAPSHOT_EMPTY],
            }

        results = []
        for idx, snap in enumerate(snapshots):
            order = snap.get("snapshot_order", idx)
            result = self.add_feature_snapshot(
                run_id=run_id,
                feature_name=snap["feature_name"],
                feature_value=snap.get("feature_value"),
                raw_value=snap.get("raw_value"),
                data_source=snap.get("data_source"),
                is_raw_dirty=snap.get("is_raw_dirty", False),
                snapshot_order=order,
            )
            results.append(result)

        success_count = sum(1 for r in results if r.get("success"))
        return {
            "success": success_count == len(snapshots),
            "total": len(snapshots),
            "success_count": success_count,
            "results": results,
        }

    def add_param_change(self, run_id, param_name, old_value=None,
                         new_value=None, change_reason=None, change_order=0):
        """
        记录一次参数变化。
        """
        with get_db_cursor(self.db_path) as conn:
            run = conn.execute(
                "SELECT id, status FROM runs WHERE run_id = ?",
                (run_id,)
            ).fetchone()
            if not run:
                return {
                    "success": False,
                    "error_code": ERROR_RUN_NOT_FOUND,
                    "error_message": ERROR_MESSAGES[ERROR_RUN_NOT_FOUND],
                }

            conn.execute(
                """
                INSERT INTO param_changes
                (run_id, param_name, old_value, new_value,
                 change_reason, change_order)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (run_id, param_name,
                 str(old_value) if old_value is not None else None,
                 str(new_value) if new_value is not None else None,
                 change_reason, change_order)
            )
            return {"success": True, "param_name": param_name}

    def add_param_changes_batch(self, run_id, changes):
        """
        批量添加参数变化记录。
        """
        results = []
        for idx, chg in enumerate(changes):
            order = chg.get("change_order", idx)
            result = self.add_param_change(
                run_id=run_id,
                param_name=chg["param_name"],
                old_value=chg.get("old_value"),
                new_value=chg.get("new_value"),
                change_reason=chg.get("change_reason"),
                change_order=order,
            )
            results.append(result)

        success_count = sum(1 for r in results if r.get("success"))
        return {
            "success": success_count == len(changes),
            "total": len(changes),
            "success_count": success_count,
            "results": results,
        }

    def get_run(self, run_id):
        """
        获取单条运行记录及关联的快照、参数变化。
        """
        with get_db_cursor(self.db_path) as conn:
            run = conn.execute(
                "SELECT * FROM runs WHERE run_id = ?", (run_id,)
            ).fetchone()
            if not run:
                return None

            snapshots = conn.execute(
                """
                SELECT * FROM feature_snapshots
                WHERE run_id = ? ORDER BY snapshot_order, id
                """,
                (run_id,)
            ).fetchall()

            param_changes = conn.execute(
                """
                SELECT * FROM param_changes
                WHERE run_id = ? ORDER BY change_order, id
                """,
                (run_id,)
            ).fetchall()

            conflicts = conn.execute(
                """
                SELECT * FROM run_conflicts
                WHERE run_id = ? AND resolved = 0
                ORDER BY created_at DESC
                """,
                (run_id,)
            ).fetchall()

            decisions = conn.execute(
                """
                SELECT * FROM manual_decisions
                WHERE run_id = ? ORDER BY created_at DESC
                """,
                (run_id,)
            ).fetchall()

            return {
                "run": dict(run),
                "feature_snapshots": [dict(s) for s in snapshots],
                "param_changes": [dict(p) for p in param_changes],
                "conflicts": [dict(c) for c in conflicts],
                "manual_decisions": [dict(d) for d in decisions],
            }

    def list_runs(self, status=None, limit=100, offset=0):
        """
        列出运行记录。
        """
        with get_db_cursor(self.db_path) as conn:
            if status:
                rows = conn.execute(
                    """
                    SELECT * FROM runs WHERE status = ?
                    ORDER BY created_at DESC LIMIT ? OFFSET ?
                    """,
                    (status, limit, offset)
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT * FROM runs
                    ORDER BY created_at DESC LIMIT ? OFFSET ?
                    """,
                    (limit, offset)
                ).fetchall()
            return [dict(r) for r in rows]

    def resolve_conflict(self, run_id, keep_existing=True):
        """
        解决 run_id 冲突。
        keep_existing=True: 保留旧记录，新提交作废
        keep_existing=False: 用新记录覆盖（但不删旧的快照和判断）
        """
        with get_db_cursor(self.db_path) as conn:
            conflicts = conn.execute(
                """
                SELECT * FROM run_conflicts
                WHERE run_id = ? AND resolved = 0
                ORDER BY created_at DESC
                """,
                (run_id,)
            ).fetchall()

            if not conflicts:
                return {"success": True, "message": "没有未解决的冲突"}

            conn.execute(
                """
                UPDATE run_conflicts SET resolved = 1
                WHERE run_id = ? AND resolved = 0
                """,
                (run_id,)
            )

            if keep_existing:
                conn.execute(
                    """
                    UPDATE runs SET status = ?, status_reason = '',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = ?
                    """,
                    (STATUS_REVIEWING, run_id)
                )
            else:
                conn.execute(
                    """
                    UPDATE runs SET status = ?, status_reason = '',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = ?
                    """,
                    (STATUS_REVIEWING, run_id)
                )

            return {
                "success": True,
                "resolved_count": len(conflicts),
                "keep_existing": keep_existing,
            }
