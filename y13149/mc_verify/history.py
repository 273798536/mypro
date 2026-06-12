import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from mc_verify.models import HistoryEntry, QuestionItem, ProcessStatus, MCResult


class HistoryStore:
    def __init__(self, store_path: str | Path = "output/history.json"):
        self.store_path = Path(store_path)
        self.entries: list[HistoryEntry] = []
        self._load()

    def _load(self):
        if self.store_path.exists():
            with open(self.store_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.entries = [HistoryEntry(**e) for e in data]

    def _save(self):
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump([asdict(e) for e in self.entries], f, ensure_ascii=False, indent=2)

    def record_import(self, items: list[QuestionItem]):
        for item in items:
            entry = HistoryEntry(
                question_id=item.question_id,
                change_type="import",
                before={},
                after={
                    "formula": item.formula,
                    "expected_value": item.expected_value,
                    "unit": item.unit,
                    "source_fields": item.source_fields,
                    "source_description": item.source_description,
                    "unit_trace": asdict(item.unit_trace) if item.unit_trace else None,
                },
                explanation=f"导入题目: 来源字段={list(item.source_fields.keys())}",
            )
            self.entries.append(entry)
        self._save()

    def record_verify(self, item: QuestionItem, result: MCResult):
        entry = HistoryEntry(
            question_id=item.question_id,
            change_type="verify",
            before={
                "process_status": item.process_status.value,
            },
            after={
                "process_status": ProcessStatus.UNIT_BLOCKED.value
                if item.unit_trace and item.unit_trace.status.value != "ok"
                else (ProcessStatus.PASSED.value if not result.anomalies else ProcessStatus.FAILED.value),
                "mc_mean": result.mc_mean,
                "mc_std": result.mc_std,
                "mc_error": result.mc_error,
                "relative_error": result.relative_error,
                "sample_count": result.sample_count,
                "anomalies": result.anomalies,
            },
            explanation="蒙特卡洛验算完成"
            + (f"；单位问题: {item.unit_trace.detail}" if item.unit_trace and item.unit_trace.status.value != "ok" else ""),
        )
        self.entries.append(entry)
        self._save()

    def record_confirm(
        self,
        question_id: str,
        before: dict,
        after: dict,
        confirmed_by: str = "human",
        explanation: str = "",
    ):
        entry = HistoryEntry(
            question_id=question_id,
            change_type="confirm",
            before=before,
            after=after,
            confirmed_by=confirmed_by,
            explanation=explanation or f"人工确认: {confirmed_by}",
        )
        self.entries.append(entry)
        self._save()

    def get_history(self, question_id: str | None = None) -> list[HistoryEntry]:
        if question_id:
            return [e for e in self.entries if e.question_id == question_id]
        return list(self.entries)

    def get_changes_since(self, since: str) -> list[HistoryEntry]:
        return [e for e in self.entries if e.timestamp >= since]
