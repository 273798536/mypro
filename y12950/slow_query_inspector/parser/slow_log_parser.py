"""MySQL 慢查询日志解析器

解析 MySQL 原生 slow.log 格式，保留原始行号用于回溯。
"""

import re
import os
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class SlowQueryEntry:
    """单条慢查询记录"""

    start_line: int
    end_line: int
    source_file: str
    timestamp: Optional[str] = None
    timestamp_unix: Optional[int] = None
    user: Optional[str] = None
    host: Optional[str] = None
    connection_id: Optional[int] = None
    query_time: float = 0.0
    lock_time: float = 0.0
    rows_sent: int = 0
    rows_examined: int = 0
    sql_text: str = ""
    database: Optional[str] = None

    @property
    def sql_summary(self) -> str:
        sql = self.sql_text.strip().replace("\n", " ")
        if len(sql) > 120:
            return sql[:117] + "..."
        return sql

    @property
    def source_ref(self) -> str:
        basename = os.path.basename(self.source_file)
        return f"{basename}:L{self.start_line}-L{self.end_line}"


class SlowLogParser:
    """MySQL 慢查询日志解析器"""

    TIME_RE = re.compile(r"^# Time:\s*(.+)$")
    USER_HOST_RE = re.compile(r"^# User@Host:\s*(\S+?)\[.*?\]\s*@\s*(\S*?)\s*\[.*?\]\s*Id:\s*(\d+)")
    STATS_RE = re.compile(
        r"^# Query_time:\s*([\d.]+)\s+Lock_time:\s*([\d.]+)\s+"
        r"Rows_sent:\s*(\d+)\s+Rows_examined:\s*(\d+)"
    )
    TIMESTAMP_SET_RE = re.compile(r"^SET timestamp=(\d+);")
    USE_DB_RE = re.compile(r"^use\s+(\S+);", re.IGNORECASE)

    def __init__(self, log_path: str, threshold: float = 1.0):
        self.log_path = log_path
        self.threshold = threshold

    def parse(self) -> List[SlowQueryEntry]:
        """解析慢查询日志，返回所有超过阈值的条目"""
        entries = []
        current_entry = None
        current_sql_lines = []
        in_sql = False
        current_db = None

        with open(self.log_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        for line_num, line in enumerate(lines, start=1):
            line = line.rstrip("\n")

            if line.startswith("# Time:"):
                if current_entry and current_sql_lines:
                    self._finalize_entry(current_entry, current_sql_lines, current_db)
                    if current_entry.query_time >= self.threshold:
                        entries.append(current_entry)
                current_entry = SlowQueryEntry(
                    start_line=line_num,
                    end_line=line_num,
                    source_file=self.log_path,
                )
                m = self.TIME_RE.match(line)
                if m:
                    current_entry.timestamp = m.group(1).strip()
                current_sql_lines = []
                in_sql = False
                continue

            if current_entry is None:
                continue

            if line.startswith("# User@Host:"):
                m = self.USER_HOST_RE.match(line)
                if m:
                    current_entry.user = m.group(1)
                    current_entry.host = m.group(2)
                    current_entry.connection_id = int(m.group(3))
                current_entry.end_line = line_num
                continue

            if line.startswith("# Query_time:"):
                m = self.STATS_RE.match(line)
                if m:
                    current_entry.query_time = float(m.group(1))
                    current_entry.lock_time = float(m.group(2))
                    current_entry.rows_sent = int(m.group(3))
                    current_entry.rows_examined = int(m.group(4))
                current_entry.end_line = line_num
                continue

            if line.startswith("SET timestamp="):
                m = self.TIMESTAMP_SET_RE.match(line)
                if m:
                    current_entry.timestamp_unix = int(m.group(1))
                in_sql = False
                current_entry.end_line = line_num
                continue

            if line.strip().lower().startswith("use "):
                m = self.USE_DB_RE.match(line.strip())
                if m:
                    current_db = m.group(1).rstrip(";")
                current_entry.end_line = line_num
                continue

            if line.startswith("#"):
                current_entry.end_line = line_num
                continue

            if line.strip() == "":
                if in_sql and current_sql_lines:
                    pass
                continue

            if not in_sql:
                in_sql = True

            current_sql_lines.append(line)
            current_entry.end_line = line_num

        if current_entry and current_sql_lines:
            self._finalize_entry(current_entry, current_sql_lines, current_db)
            if current_entry.query_time >= self.threshold:
                entries.append(current_entry)

        entries.sort(key=lambda e: e.query_time, reverse=True)
        return entries

    def _finalize_entry(self, entry: SlowQueryEntry, sql_lines: list, current_db: Optional[str]):
        sql_text = "\n".join(sql_lines).strip()
        if sql_text.endswith(";"):
            sql_text = sql_text[:-1]
        entry.sql_text = sql_text
        if current_db:
            entry.database = current_db

    def group_by_database(self, entries: List[SlowQueryEntry]) -> dict:
        groups = {}
        for entry in entries:
            db = entry.database or "(unknown)"
            if db not in groups:
                groups[db] = []
            groups[db].append(entry)
        return groups

    def summary(self, entries: List[SlowQueryEntry]) -> dict:
        total = len(entries)
        if total == 0:
            return {"total": 0, "avg_time": 0, "max_time": 0, "total_time": 0}

        total_time = sum(e.query_time for e in entries)
        max_time = max(e.query_time for e in entries)
        avg_time = total_time / total

        return {
            "total": total,
            "avg_time": round(avg_time, 3),
            "max_time": round(max_time, 3),
            "total_time": round(total_time, 3),
        }
