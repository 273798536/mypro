import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from .models import (
    ParamRow, WeightChange, Note, Unit,
)


class ParamTableManager:
    def __init__(self, version: str = "unknown"):
        self.version = version
        self.rows: Dict[str, ParamRow] = {}
        self.weight_changes: List[WeightChange] = []
        self.notes: List[Note] = []
        self._row_counter = 0
        self._note_counter = 0
        self._change_counter = 0

    def load_from_json(self, path: str) -> None:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "version" in data:
            self.version = data["version"]
        for row_data in data.get("rows", []):
            row = ParamRow(**row_data)
            self.rows[row.row_id] = row

    def add_row(self, param_name: str, param_value: float, unit: Unit,
                weight: float = 1.0, description: str = "",
                source_line: str = "",
                valid_range: Optional[Dict[str, float]] = None) -> ParamRow:
        self._row_counter += 1
        row_id = f"ROW-{self._row_counter:04d}"
        row = ParamRow(
            row_id=row_id,
            row_number=self._row_counter,
            param_name=param_name,
            param_value=param_value,
            unit=unit,
            weight=weight,
            description=description,
            source_line=source_line or f"参数表第{self._row_counter}行",
            valid_range=valid_range,
        )
        self.rows[row_id] = row
        return row

    def update_weight(self, row_id: str, new_weight: float,
                      changed_by: str, reason: str = "") -> WeightChange:
        if row_id not in self.rows:
            raise ValueError(f"[VERIFY-E001] 参数行不存在: row_id={row_id}")
        row = self.rows[row_id]
        old_weight = row.weight
        if old_weight == new_weight:
            raise ValueError(f"[VERIFY-E002] 权重未变化: row_id={row_id}, weight={old_weight}")
        self._change_counter += 1
        change = WeightChange(
            row_id=row_id,
            param_name=row.param_name,
            old_weight=old_weight,
            new_weight=new_weight,
            changed_by=changed_by,
            changed_at=datetime.now(),
            reason=reason,
        )
        row.weight = new_weight
        self.weight_changes.append(change)
        return change

    def add_note(self, target_type: str, target_id: str, content: str,
                 author: str, is_temporary: bool = False) -> Note:
        self._note_counter += 1
        note = Note(
            note_id=f"NOTE-{self._note_counter:04d}",
            target_type=target_type,
            target_id=target_id,
            content=content,
            author=author,
            created_at=datetime.now(),
            is_temporary=is_temporary,
        )
        self.notes.append(note)
        return note

    def get_row(self, row_id: str) -> ParamRow:
        if row_id not in self.rows:
            raise ValueError(f"[VERIFY-E001] 参数行不存在: row_id={row_id}")
        return self.rows[row_id]

    def list_rows(self) -> List[ParamRow]:
        return sorted(self.rows.values(), key=lambda r: r.row_number)

    def diff_weights(self, other: "ParamTableManager") -> List[Tuple[ParamRow, ParamRow, float, float]]:
        diffs = []
        for row_id in set(self.rows.keys()) | set(other.rows.keys()):
            a = self.rows.get(row_id)
            b = other.rows.get(row_id)
            if a and b and abs(a.weight - b.weight) > 1e-9:
                diffs.append((a, b, a.weight, b.weight))
        return diffs

    def diff_values(self, other: "ParamTableManager") -> List[Tuple[ParamRow, ParamRow, float, float]]:
        diffs = []
        for row_id in set(self.rows.keys()) | set(other.rows.keys()):
            a = self.rows.get(row_id)
            b = other.rows.get(row_id)
            if a and b and abs(a.param_value - b.param_value) > 1e-9:
                diffs.append((a, b, a.param_value, b.param_value))
        return diffs

    def to_dict(self) -> Dict:
        return {
            "version": self.version,
            "rows": [r.model_dump() for r in self.list_rows()],
        }

    def save_to_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2, default=str)
