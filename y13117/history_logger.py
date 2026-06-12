import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from datetime import datetime
from calculator import CalcResult, CalcParam


@dataclass
class HistoryRecord:
    record_id: str
    problem_id: str
    operator: str
    action: str
    before_snapshot: Dict = field(default_factory=dict)
    after_snapshot: Dict = field(default_factory=dict)
    remark: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))


class HistoryLogger:
    def __init__(self, storage_path: str = "history.json"):
        self.storage_path = storage_path
        self.records: List[HistoryRecord] = []
        self._load()

    def _load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.records = [HistoryRecord(**r) for r in data]
            except Exception:
                self.records = []

    def _save(self):
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump([asdict(r) for r in self.records], f, ensure_ascii=False, indent=2)

    def log_manual_correction(
        self,
        problem_id: str,
        operator: str,
        before_result: CalcResult,
        after_result: CalcResult,
        remark: str = ""
    ) -> str:
        record_id = f"REC-{len(self.records)+1:04d}"
        record = HistoryRecord(
            record_id=record_id,
            problem_id=problem_id,
            operator=operator,
            action="人工修正",
            before_snapshot=_result_to_dict(before_result),
            after_snapshot=_result_to_dict(after_result),
            remark=remark,
        )
        self.records.append(record)
        self._save()
        return record_id

    def log_param_adjustment(
        self,
        problem_id: str,
        operator: str,
        param_name: str,
        old_value,
        new_value,
        old_unit: str,
        new_unit: str,
        remark: str = ""
    ) -> str:
        record_id = f"REC-{len(self.records)+1:04d}"
        record = HistoryRecord(
            record_id=record_id,
            problem_id=problem_id,
            operator=operator,
            action="参数调整",
            before_snapshot={
                "param": param_name,
                "value": old_value,
                "unit": old_unit,
            },
            after_snapshot={
                "param": param_name,
                "value": new_value,
                "unit": new_unit,
            },
            remark=remark,
        )
        self.records.append(record)
        self._save()
        return record_id

    def get_records_by_problem(self, problem_id: str) -> List[HistoryRecord]:
        return [r for r in self.records if r.problem_id == problem_id]

    def get_all_records(self) -> List[HistoryRecord]:
        return list(self.records)


def _result_to_dict(result: CalcResult) -> Dict:
    return {
        "problem_id": result.problem_id,
        "formula_used": result.formula_used,
        "raw_result": result.raw_result,
        "result_unit": result.result_unit,
        "params": {k: {"value": v.value, "unit": v.unit} for k, v in result.params.items()},
        "material_check": result.material_check,
        "next_steps": result.next_steps,
        "timestamp": result.timestamp,
    }
