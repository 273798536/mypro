from __future__ import annotations

from datetime import datetime
from typing import Optional

from src.de_report.models import (
    Record, RecordStatus, RecordSource, ExtrapolationAlert,
    StatusChangeLog, StatusTransitionError,
)

VALID_TRANSITIONS: dict[RecordStatus, set[RecordStatus]] = {
    RecordStatus.CREATED: {RecordStatus.PENDING_CONFIRM},
    RecordStatus.PENDING_CONFIRM: {RecordStatus.CONFIRMED, RecordStatus.REJECTED},
    RecordStatus.CONFIRMED: {RecordStatus.PENDING_CONFIRM},
    RecordStatus.REJECTED: {RecordStatus.PENDING_CONFIRM},
}

TRANSITION_REASONS: dict[tuple[RecordStatus, RecordStatus], str] = {
    (RecordStatus.CREATED, RecordStatus.PENDING_CONFIRM): "新建记录提交待确认",
    (RecordStatus.PENDING_CONFIRM, RecordStatus.CONFIRMED): "确认通过",
    (RecordStatus.PENDING_CONFIRM, RecordStatus.REJECTED): "确认退回，需修正后重新提交",
    (RecordStatus.CONFIRMED, RecordStatus.PENDING_CONFIRM): "已确认记录需重新审核",
    (RecordStatus.REJECTED, RecordStatus.PENDING_CONFIRM): "退回记录修正后重新提交",
}

INVALID_TRANSITION_MESSAGES: dict[RecordStatus, str] = {
    RecordStatus.CREATED: "新建记录只能提交到待确认，不能直接确认或退回",
    RecordStatus.PENDING_CONFIRM: "待确认记录只能确认或退回",
    RecordStatus.CONFIRMED: "已确认记录只能退回待确认重新审核",
    RecordStatus.REJECTED: "退回记录只能重新提交到待确认",
}


class StateMachine:
    def __init__(self) -> None:
        self._records: dict[str, Record] = {}
        self._changelog: list[StatusChangeLog] = []
        self._extrapolation_window: list[str] = []

    def load_records(self, records: list[Record]) -> list[StatusChangeLog]:
        logs: list[StatusChangeLog] = []
        for rec in records:
            if rec.id in self._records:
                existing = self._records[rec.id]
                if rec.version <= existing.version:
                    continue
                log = StatusChangeLog(
                    record_id=rec.id,
                    from_status=existing.status,
                    to_status=rec.status,
                    remark=f"重新导入：原备注「{existing.original_remark}」→ 新备注「{rec.original_remark}」",
                )
                logs.append(log)
                self._changelog.append(log)
            self._records[rec.id] = rec.model_copy(deep=True)
            self._check_extrapolation(rec)
        return logs

    def get_record(self, record_id: str) -> Optional[Record]:
        return self._records.get(record_id)

    def list_records(self) -> list[Record]:
        return list(self._records.values())

    def transition(
        self, record_id: str, to_status: RecordStatus, operator: str = "system"
    ) -> StatusChangeLog:
        rec = self._records.get(record_id)
        if rec is None:
            raise StatusTransitionError(
                record_id, RecordStatus.CREATED, to_status, "记录不存在"
            )

        from_status = rec.status
        if to_status not in VALID_TRANSITIONS.get(from_status, set()):
            reason = INVALID_TRANSITION_MESSAGES.get(
                from_status, f"不允许从 {from_status.value} 转为 {to_status.value}"
            )
            raise StatusTransitionError(record_id, from_status, to_status, reason)

        log = StatusChangeLog(
            record_id=record_id,
            from_status=from_status,
            to_status=to_status,
            operator=operator,
            remark=TRANSITION_REASONS.get((from_status, to_status), ""),
        )

        rec.status = to_status
        rec.updated_at = datetime.now()
        rec.screenshot_note = self._build_screenshot_note(rec, log)
        self._changelog.append(log)
        return log

    def get_changelog(self, record_id: Optional[str] = None) -> list[StatusChangeLog]:
        if record_id is None:
            return list(self._changelog)
        return [l for l in self._changelog if l.record_id == record_id]

    def _build_screenshot_note(self, rec: Record, log: StatusChangeLog) -> str:
        parts = [f"[{log.to_status.value}]"]
        if rec.original_remark:
            parts.append(f"原备注：{rec.original_remark}")
        if log.remark:
            parts.append(f"变更：{log.remark}")
        return " | ".join(parts)

    def _check_extrapolation(self, rec: Record) -> None:
        if rec.extrapolation_alert == ExtrapolationAlert.CONSECUTIVE_OUT_OF_BOUND:
            self._extrapolation_window.append(rec.id)
            rec.boundary_conditions = [
                bc.model_copy(update={
                    "note": bc.note + " 【连续越界提示：检查上游选题材料是否合理】"
                })
                for bc in rec.boundary_conditions
            ]
        elif rec.extrapolation_alert == ExtrapolationAlert.SINGLE_OUT_OF_BOUND:
            self._extrapolation_window.append(rec.id)
        else:
            self._extrapolation_window = []

    def get_extrapolation_warnings(self) -> list[dict]:
        warnings: list[dict] = []
        consecutive_ids: list[str] = []
        for rid in self._extrapolation_window:
            rec = self._records.get(rid)
            if rec and rec.extrapolation_alert in (
                ExtrapolationAlert.SINGLE_OUT_OF_BOUND,
                ExtrapolationAlert.CONSECUTIVE_OUT_OF_BOUND,
            ):
                consecutive_ids.append(rid)
            else:
                if len(consecutive_ids) >= 2:
                    warnings.append({
                        "type": "连续外推越界",
                        "record_ids": list(consecutive_ids),
                        "suggestion": "连续多条外推越界，请检查上游材料选题是否存在系统性问题",
                    })
                consecutive_ids = []
        if len(consecutive_ids) >= 2:
            warnings.append({
                "type": "连续外推越界",
                "record_ids": list(consecutive_ids),
                "suggestion": "连续多条外推越界，请检查上游材料选题是否存在系统性问题",
            })
        return warnings

    def get_trace(self, record_id: str) -> Optional[dict]:
        rec = self._records.get(record_id)
        if rec is None:
            return None
        changes = self.get_changelog(record_id)
        return {
            "record_id": record_id,
            "current_status": rec.status.value,
            "source": rec.source.value,
            "original_remark": rec.original_remark,
            "screenshot_note": rec.screenshot_note,
            "boundary_conditions": [
                {
                    "symbol": bc.symbol,
                    "equation_text": bc.equation_text,
                    "valid_range": bc.valid_range,
                    "note": bc.note,
                }
                for bc in rec.boundary_conditions
            ],
            "status_history": [
                {
                    "from": ch.from_status.value,
                    "to": ch.to_status.value,
                    "time": ch.timestamp.isoformat(),
                    "operator": ch.operator,
                    "remark": ch.remark,
                }
                for ch in changes
            ],
        }
