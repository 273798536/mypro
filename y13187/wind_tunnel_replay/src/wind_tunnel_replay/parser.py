from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from .types import LogEntry, LogKind


_TS_PATTERNS = [
    re.compile(r"(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})"),
    re.compile(r"(\d{4}/\d{2}/\d{2}[ T]\d{2}:\d{2}:\d{2})"),
]
_PARAM_PATTERN = re.compile(r"([A-Z_][A-Z0-9_]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)")
_WITHDRAW_TARGET = re.compile(r"(?:line|L|行)\s*#?\s*(\d+)", re.IGNORECASE)
_OBJECT_PATTERN = re.compile(r"obj(?:ect)?[_\s:]*([A-Za-z0-9_\-]+)", re.IGNORECASE)


class LogParser:
    def __init__(self, parser_config: dict[str, Any]):
        self.cfg = parser_config
        self.new_prefix = self.cfg.get("log_version_new_prefix", "[V2]")
        self.old_prefix = self.cfg.get("log_version_old_prefix", "[V1]")
        self.withdraw_prefix = self.cfg.get("withdraw_prefix", "[WITHDRAW]")
        self.remark_prefixes = tuple(self.cfg.get("remark_prefixes", ["[REMARK]", "#", "NOTE:"]))
        self.ts_formats = self.cfg.get("ts_formats", [
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ])

    def parse_file(self, path: str | Path) -> list[LogEntry]:
        path = Path(path)
        with path.open("r", encoding="utf-8") as fh:
            lines = fh.readlines()
        return [self._parse_line(idx + 1, line.rstrip("\n")) for idx, line in enumerate(lines)]

    def _parse_line(self, line_no: int, raw: str) -> LogEntry:
        stripped = raw.strip()
        entry = LogEntry(line_no=line_no, raw=raw, kind=LogKind.UNKNOWN)
        if not stripped:
            entry.kind = LogKind.REMARK
            entry.message = "(空行)"
            return entry

        entry.timestamp = self._extract_timestamp(stripped)
        entry.params = self._extract_params(stripped)
        entry.objects = self._extract_objects(stripped)

        if self.withdraw_prefix in stripped:
            entry.kind = LogKind.WITHDRAW
            prefix_pos = stripped.find(self.withdraw_prefix)
            entry.message = (stripped[:prefix_pos] + stripped[prefix_pos + len(self.withdraw_prefix):]).strip()
            m = _WITHDRAW_TARGET.search(entry.message)
            if m:
                entry.withdraw_target_line = int(m.group(1))
            return entry

        for pref in self.remark_prefixes:
            if stripped.startswith(pref):
                entry.kind = LogKind.REMARK
                entry.message = stripped[len(pref):].strip()
                return entry

        if self.new_prefix in stripped:
            entry.kind = LogKind.DATA
            entry.version = "new"
            entry.message = stripped.replace(self.new_prefix, "", 1).strip()
            return entry

        if self.old_prefix in stripped:
            entry.kind = LogKind.DATA
            entry.version = "old"
            entry.message = stripped.replace(self.old_prefix, "", 1).strip()
            return entry

        if entry.params:
            entry.kind = LogKind.DATA
            entry.version = "unmarked"
            entry.message = stripped
            return entry

        entry.kind = LogKind.REMARK
        entry.message = stripped
        return entry

    def _extract_timestamp(self, text: str) -> datetime | None:
        for pat in _TS_PATTERNS:
            m = pat.search(text)
            if not m:
                continue
            candidate = m.group(1).replace("T", " ")
            for fmt in self.ts_formats:
                try:
                    return datetime.strptime(candidate.replace("/", "-") if "/" in candidate and "-" in fmt else candidate, fmt.replace("/", "-") if "/" not in candidate else fmt)
                except ValueError:
                    continue
            try:
                return datetime.fromisoformat(m.group(1))
            except ValueError:
                continue
        return None

    def _extract_params(self, text: str) -> dict[str, float]:
        result: dict[str, float] = {}
        for m in _PARAM_PATTERN.finditer(text):
            try:
                result[m.group(1)] = float(m.group(2))
            except ValueError:
                continue
        return result

    def _extract_objects(self, text: str) -> list[str]:
        return [m.group(1) for m in _OBJECT_PATTERN.finditer(text)]
