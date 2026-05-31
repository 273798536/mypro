from __future__ import annotations

import csv
import uuid
from datetime import datetime
from io import StringIO
from typing import Any, Dict, List, Optional, Tuple

from midi_grader.models import (
    BadRow,
    BadRowReason,
    CleanedData,
    TraceRecord,
)


class DataCleaner:
    VELOCITY_COLUMNS = {"velocity", "力度", "vel", "dynamics"}
    REMARK_COLUMNS = {"remark", "备注", "note", "comment", "批改备注"}
    REQUIRED_COLUMNS = {"pitch", "start_tick", "duration_tick"}
    ALL_KNOWN_COLUMNS = VELOCITY_COLUMNS | REMARK_COLUMNS | REQUIRED_COLUMNS | {
        "channel", "track_idx", "velocity", "bpm", "tick", "expected_beat", "actual_beat",
        "音高", "起始tick", "持续tick", "通道", "轨道",
    }

    def __init__(self, expected_columns: Optional[int] = None) -> None:
        self._expected_columns = expected_columns
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def clean_text(self, text: str, source: str = "unknown") -> CleanedData:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step("clean", f"开始清洗文本数据，来源: {source}", self._now(), source=source)

        lines = text.splitlines()
        valid_rows: List[Dict[str, Any]] = []
        bad_rows: List[BadRow] = []

        for line_no, raw_line in enumerate(lines, start=1):
            stripped = raw_line.strip()

            if not stripped:
                bad_rows.append(BadRow(
                    raw_line=raw_line,
                    line_number=line_no,
                    reason=BadRowReason.EMPTY_LINE,
                    detail="空行",
                    source=source,
                ))
                continue

            if stripped.startswith("#") or stripped.startswith("//") or stripped.startswith("--"):
                bad_rows.append(BadRow(
                    raw_line=raw_line,
                    line_number=line_no,
                    reason=BadRowReason.COMMENT_LINE,
                    detail="备注行",
                    source=source,
                ))
                continue

            row = self._parse_csv_line(stripped)
            if row is None:
                bad_rows.append(BadRow(
                    raw_line=raw_line,
                    line_number=line_no,
                    reason=BadRowReason.PARSE_FAILURE,
                    detail="CSV解析失败",
                    source=source,
                ))
                continue

            validation = self._validate_row(row, line_no)
            if validation:
                bad_rows.append(BadRow(
                    raw_line=raw_line,
                    line_number=line_no,
                    reason=validation[0],
                    detail=validation[1],
                    source=source,
                ))
                continue

            valid_rows.append(row)

        self._trace.add_step(
            "clean",
            f"清洗完成: 有效行={len(valid_rows)}, 坏行={len(bad_rows)}",
            self._now(),
            valid_count=len(valid_rows),
            bad_count=len(bad_rows),
        )

        return CleanedData(valid_rows=valid_rows, bad_rows=bad_rows, source=source, trace=self._trace)

    def clean_file(self, file_path: str, source: Optional[str] = None) -> CleanedData:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        return self.clean_text(text, source=source or file_path)

    def _parse_csv_line(self, line: str) -> Optional[Dict[str, Any]]:
        try:
            reader = csv.reader(StringIO(line))
            fields = next(reader)
        except Exception:
            return None

        if not fields:
            return None

        if self._is_header_row(fields):
            return None

        row = self._fields_to_dict(fields)
        return row

    def _is_header_row(self, fields: List[str]) -> bool:
        stripped = [f.strip().lower() for f in fields]
        header_keywords = {"pitch", "velocity", "start", "duration", "音高", "力度", "tick"}
        matches = sum(1 for s in stripped if any(kw in s for kw in header_keywords))
        return matches >= 2

    def _fields_to_dict(self, fields: List[str]) -> Dict[str, Any]:
        positional_keys = ["pitch", "velocity", "start_tick", "duration_tick", "channel", "track_idx"]
        row: Dict[str, Any] = {}

        for i, field in enumerate(fields):
            stripped = field.strip()
            if "=" in stripped:
                key, _, value = stripped.partition("=")
                row[key.strip()] = self._try_parse_value(value.strip())
            elif i < len(positional_keys):
                row[positional_keys[i]] = self._try_parse_value(stripped)
            else:
                row[f"col_{i}"] = self._try_parse_value(stripped)

        return row

    def _try_parse_value(self, value: str) -> Any:
        try:
            return int(value)
        except ValueError:
            pass
        try:
            return float(value)
        except ValueError:
            pass
        return value

    def _validate_row(self, row: Dict[str, Any], line_no: int) -> Optional[Tuple[BadRowReason, str]]:
        if self._expected_columns and len(row) < self._expected_columns:
            return (BadRowReason.MISSING_COLUMN, f"期望{self._expected_columns}列，实际{len(row)}列")

        if "pitch" in row:
            try:
                pitch = int(row["pitch"])
                if not (0 <= pitch <= 127):
                    return (BadRowReason.INVALID_PITCH, f"音高值{pitch}超出0-127范围")
            except (ValueError, TypeError):
                return (BadRowReason.INVALID_PITCH, f"音高值无法解析: {row['pitch']}")

        if "velocity" in row:
            try:
                vel = int(row["velocity"])
                if not (0 <= vel <= 127):
                    return (BadRowReason.INVALID_VELOCITY, f"力度值{vel}超出0-127范围")
            except (ValueError, TypeError):
                return (BadRowReason.INVALID_VELOCITY, f"力度值无法解析: {row['velocity']}")

        return None

    @property
    def trace(self) -> TraceRecord:
        return self._trace
