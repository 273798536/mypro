from __future__ import annotations

import csv
import os
from typing import Iterator, Optional

import pandas as pd

from .models import (
    IssueSeverity,
    IssueType,
    ParseOutcome,
    ParsedRecord,
    RawRecord,
    ValidationIssue,
)


class DataParser:
    def __init__(self, source_file: str, sheet_name: Optional[str] = None):
        self.source_file = source_file
        self.sheet_name = sheet_name
        self._raw_lines: list[str] = []
        self._headers: list[str] = []
        self._total_rows = 0
        self._load_raw()

    def _load_raw(self) -> None:
        ext = os.path.splitext(self.source_file)[1].lower()
        if ext in (".xlsx", ".xls"):
            self._load_excel()
        else:
            self._load_csv()

    def _load_csv(self) -> None:
        with open(self.source_file, "r", encoding="utf-8-sig", newline="") as f:
            content = f.readlines()
        self._raw_lines = [line.rstrip("\n").rstrip("\r") for line in content]
        if self._raw_lines:
            reader = csv.reader([self._raw_lines[0]])
            self._headers = next(reader)
            self._total_rows = len(self._raw_lines) - 1 if len(self._raw_lines) > 0 else 0

    def _load_excel(self) -> None:
        df = pd.read_excel(self.source_file, sheet_name=self.sheet_name or 0, dtype=object)
        self._headers = list(df.columns)
        self._total_rows = len(df)
        self._raw_lines = [",".join(str(h) for h in self._headers)]
        for _, row in df.iterrows():
            values = []
            for h in self._headers:
                v = row.get(h, "")
                if pd.isna(v):
                    values.append("")
                else:
                    values.append(str(v))
            self._raw_lines.append(",".join(values))

    @property
    def headers(self) -> list[str]:
        return self._headers

    @property
    def total_rows(self) -> int:
        return self._total_rows

    NUMERIC_FIELD_KEYWORDS = {
        "value", "prob", "probability",
        "alpha", "beta",
        "shape", "rate",
        "mu", "nu",
        "numerator", "denominator",
        "dividend", "divisor",
    }

    NON_NUMERIC_FIELD_KEYWORDS = {
        "remark", "note", "comment", "description", "formula", "expr", "calc",
        "name", "type", "prior_type", "field_name",
    }

    def _is_numeric_field(self, field_name: str) -> bool:
        lower = field_name.lower()
        for non_num in self.NON_NUMERIC_FIELD_KEYWORDS:
            if non_num in lower:
                exact = (lower == non_num) or lower.startswith(non_num + "_") or lower.endswith("_" + non_num)
                if exact:
                    return False
        for num_kw in self.NUMERIC_FIELD_KEYWORDS:
            exact = (lower == num_kw) or lower.startswith(num_kw + "_") or lower.endswith("_" + num_kw) or (num_kw + "_") in lower or ("_" + num_kw) in lower
            if exact:
                return True
        return False

    def _has_required_keys(self, raw_values: dict) -> bool:
        lower_keys = {k.lower() for k in raw_values.keys()}
        has_prior_type = any("prior_type" in k or "type" in k for k in lower_keys if str(raw_values.get(k, "")).strip())
        has_any_value = any(
            self._is_numeric_field(k) and str(raw_values.get(k, "")).strip()
            for k in raw_values.keys()
        )
        return has_prior_type or has_any_value

    def _classify_row(self, raw_values: dict, parse_errors: list[str]) -> ParseOutcome:
        if not self._has_required_keys(raw_values):
            return ParseOutcome.SKIPPED
        if len(parse_errors) >= 2:
            return ParseOutcome.BAD
        if len(parse_errors) == 1:
            return ParseOutcome.BAD
        return ParseOutcome.PARSED

    def _parse_value(self, raw_val: str, field_name: str) -> tuple[Optional[float], Optional[str]]:
        raw_val = str(raw_val).strip()
        if raw_val == "":
            return None, None
        try:
            return float(raw_val), None
        except (ValueError, TypeError):
            return None, f"字段 '{field_name}' 无法解析为数值: '{raw_val}'"

    def iter_records(self) -> Iterator[ParsedRecord]:
        for idx in range(1, len(self._raw_lines)):
            row_number = idx + 1
            raw_line = self._raw_lines[idx]

            raw_values: dict = {}
            parse_errors: list[str] = []
            parsed_values: dict = {}

            try:
                reader = csv.reader([raw_line])
                cells = next(reader)
            except Exception as e:
                raw_values = {"_raw": raw_line}
                parse_errors.append(f"行解析失败: {e}")
                outcome = ParseOutcome.BAD
            else:
                for col_idx, header in enumerate(self._headers):
                    if col_idx < len(cells):
                        val = cells[col_idx]
                    else:
                        val = ""
                    raw_values[header] = val

                    if self._is_numeric_field(header):
                        parsed_val, err = self._parse_value(val, header)
                        if err:
                            parse_errors.append(err)
                        elif parsed_val is not None:
                            parsed_values[header] = parsed_val

                outcome = self._classify_row(raw_values, parse_errors)

                if outcome != ParseOutcome.PARSED:
                    for err in parse_errors:
                        pass

            raw_record = RawRecord(
                row_number=row_number,
                source_file=self.source_file,
                raw_line=raw_line,
                raw_values=raw_values,
            )

            issues: list[ValidationIssue] = []
            for err in parse_errors:
                issues.append(
                    ValidationIssue(
                        issue_type=IssueType.PARSE_ERROR,
                        severity=IssueSeverity.ERROR,
                        message=err,
                        raw_value=raw_values,
                        evidence={
                            "row_number": row_number,
                            "source_file": self.source_file,
                            "raw_line": raw_line,
                        },
                    )
                )

            yield ParsedRecord(
                raw_record=raw_record,
                outcome=outcome,
                parsed_values=parsed_values,
                parse_errors=parse_errors,
                issues=issues,
            )
