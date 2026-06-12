import json
import csv
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import CalculationResult, HistoryRecord, BatchRunReport


class HistoryTracker:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path
        self.records: List[HistoryRecord] = []
        self._result_snapshots: Dict[str, Dict[str, Any]] = {}

    def record_result(self, result: CalculationResult) -> None:
        key = result.question_id
        prev = self._result_snapshots.get(key)
        current = {
            "final_value": result.final_value,
            "final_unit": result.final_unit.value if result.final_unit else None,
            "status": result.status.value,
            "conclusion": result.conclusion,
            "exceptions": [e.to_dict() for e in result.exceptions],
            "confirmations": [c.to_dict() for c in result.confirmations],
        }
        if prev is None:
            change_type = "initial_calculation"
            before = {}
        else:
            change_type = "recalculation"
            before = prev
            if current.get("final_value") != before.get("final_value"):
                change_type = "value_changed"
            if current.get("status") != before.get("status"):
                change_type = "status_changed"
            confirmed_now = any(
                c.get("status") in ("confirmed", "auto_passed")
                for c in current.get("confirmations", [])
            )
            confirmed_before = any(
                c.get("status") in ("confirmed", "auto_passed")
                for c in before.get("confirmations", [])
            )
            if confirmed_now and not confirmed_before:
                change_type = "confirmation_applied"
        record = HistoryRecord(
            result_id=result.result_id,
            question_id=result.question_id,
            change_type=change_type,
            before=before,
            after=current,
            operator="system",
            change_reason=f"排队窗口参数试算执行：{change_type}",
        )
        self.records.append(record)
        self._result_snapshots[key] = current
        if self.storage_path:
            self._flush()

    def record_manual_change(
        self,
        result: CalculationResult,
        change_type: str,
        before: Dict[str, Any],
        after: Dict[str, Any],
        operator: str,
        reason: str,
    ) -> HistoryRecord:
        record = HistoryRecord(
            result_id=result.result_id,
            question_id=result.question_id,
            change_type=change_type,
            before=before,
            after=after,
            operator=operator,
            change_reason=reason,
        )
        self.records.append(record)
        self._result_snapshots[result.question_id] = after
        if self.storage_path:
            self._flush()
        return record

    def query_by_question(self, question_id: str) -> List[HistoryRecord]:
        return [r for r in self.records if r.question_id == question_id]

    def to_list(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.records]

    def _flush(self) -> None:
        if not self.storage_path:
            return
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(self.to_list(), f, ensure_ascii=False, indent=2)


def export_report_to_json(report: BatchRunReport, output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    data = report.to_dict()
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return output_path


def export_report_to_csv(report: BatchRunReport, output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    rows = []
    for r in report.results:
        rows.append({
            "result_id": r.result_id,
            "question_id": r.question_id,
            "question_name": r.question_name,
            "raw_value": r.raw_value,
            "raw_unit": r.raw_unit.value if r.raw_unit else "",
            "adjusted_value": r.adjusted_value,
            "adjusted_unit": r.adjusted_unit.value if r.adjusted_unit else "",
            "final_value": r.final_value,
            "final_unit": r.final_unit.value if r.final_unit else "",
            "conclusion": r.conclusion,
            "linked_note": r.linked_note or "",
            "status": r.status.value,
            "exception_count": len(r.exceptions),
            "needs_confirmation": r.status.value == "needs_confirmation",
            "timestamp": r.timestamp,
        })
    if not rows:
        return output_path
    fieldnames = list(rows[0].keys())
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return output_path


def export_history_to_json(tracker: HistoryTracker, output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(tracker.to_list(), f, ensure_ascii=False, indent=2)
    return output_path


def load_questions_from_json(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
