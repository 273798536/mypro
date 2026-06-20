from .database import get_db_cursor
from .tracker import NegSampleTracker
from .constants import (
    STATUS_APPROVED,
    STATUS_REJECTED,
    DECISION_APPROVE,
    DECISION_REJECT,
    DECISION_LABELS,
    STATUS_LABELS,
    ERROR_RUN_NOT_FOUND,
    ERROR_INVALID_STATUS,
    ERROR_MESSAGES,
)


class DecisionManager:
    def __init__(self, db_path=None):
        self.db_path = db_path
        self.tracker = NegSampleTracker(db_path)

    def make_decision(self, run_id, decision, decision_note=None,
                      decided_by=None, model_version_snapshot=None):
        """
        做出人工判断。每次判断新增一条记录，不覆盖旧判断。
        
        decision: "approve"（放行）或 "reject"（补材料）
        """
        if decision not in (DECISION_APPROVE, DECISION_REJECT):
            return {
                "success": False,
                "error_code": ERROR_INVALID_STATUS,
                "error_message": ERROR_MESSAGES[ERROR_INVALID_STATUS],
            }

        with get_db_cursor(self.db_path) as conn:
            run = conn.execute(
                "SELECT id, model_version, status FROM runs WHERE run_id = ?",
                (run_id,)
            ).fetchone()
            if not run:
                return {
                    "success": False,
                    "error_code": ERROR_RUN_NOT_FOUND,
                    "error_message": ERROR_MESSAGES[ERROR_RUN_NOT_FOUND],
                }

            prev_decision = conn.execute(
                """
                SELECT id FROM manual_decisions
                WHERE run_id = ? ORDER BY created_at DESC LIMIT 1
                """,
                (run_id,)
            ).fetchone()

            prev_decision_id = prev_decision["id"] if prev_decision else None

            if model_version_snapshot is None:
                model_version_snapshot = run["model_version"]

            conn.execute(
                """
                INSERT INTO manual_decisions
                (run_id, decision, decision_note, decided_by,
                 model_version_snapshot, prev_decision_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (run_id, decision, decision_note, decided_by,
                 model_version_snapshot, prev_decision_id)
            )

            new_status = STATUS_APPROVED if decision == DECISION_APPROVE else STATUS_REJECTED
            status_reason = f"人工判断：{DECISION_LABELS.get(decision, decision)}"
            if decision_note:
                status_reason += f" - {decision_note}"

            conn.execute(
                """
                UPDATE runs SET status = ?, status_reason = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE run_id = ?
                """,
                (new_status, status_reason, run_id)
            )

            return {
                "success": True,
                "run_id": run_id,
                "decision": decision,
                "decision_label": DECISION_LABELS.get(decision, decision),
                "new_status": new_status,
                "new_status_label": STATUS_LABELS.get(new_status, new_status),
                "prev_decision_id": prev_decision_id,
            }

    def approve(self, run_id, decision_note=None, decided_by=None,
            model_version_snapshot=None):
        """快捷方法：放行"""
        return self.make_decision(
            run_id=run_id,
            decision=DECISION_APPROVE,
            decision_note=decision_note,
            decided_by=decided_by,
            model_version_snapshot=model_version_snapshot,
        )

    def reject(self, run_id, decision_note=None, decided_by=None,
               model_version_snapshot=None):
        """快捷方法：补材料"""
        return self.make_decision(
            run_id=run_id,
            decision=DECISION_REJECT,
            decision_note=decision_note,
            decided_by=decided_by,
            model_version_snapshot=model_version_snapshot,
        )

    def get_decision_history(self, run_id):
        """
        获取某条 run 的所有人工判断历史，按时间倒序。
        """
        run_data = self.tracker.get_run(run_id)
        if not run_data:
            return None
        return run_data["manual_decisions"]

    def get_latest_decision(self, run_id):
        """
        获取最新一条人工判断。
        """
        history = self.get_decision_history(run_id)
        if not history:
            return None
        return history[0]

    def list_decisions(self, decision=None, limit=100, offset=0):
        """
        列出人工判断列表。"""
        with get_db_cursor(self.db_path) as conn:
            if decision:
                rows = conn.execute(
                    """
                    SELECT md.*, runs.status, runs.model_version
                    FROM manual_decisions md
                    JOIN runs ON md.run_id = runs.run_id
                    WHERE md.decision = ?
                    ORDER BY md.created_at DESC
                    LIMIT ? OFFSET ?
                    """,
                    (decision, limit, offset)
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT md.*, runs.status, runs.model_version
                    FROM manual_decisions md
                    JOIN runs ON md.run_id = runs.run_id
                    ORDER BY md.created_at DESC
                    LIMIT ? OFFSET ?
                    """,
                    (limit, offset)
                ).fetchall()
            return [dict(r) for r in rows]
