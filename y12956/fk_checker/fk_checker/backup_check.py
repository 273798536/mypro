import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime
from .core import CheckResult, BrokenLinkRecord


@dataclass
class BackupGapRecord:
    table_name: str
    gap_type: str
    description: str
    expected_count: int = 0
    actual_count: int = 0
    gap_size: int = 0
    sample_ids: List[Any] = field(default_factory=list)
    severity: str = "medium"


@dataclass
class BackupCheckResult:
    check_time: str = ""
    total_tables: int = 0
    tables_checked: int = 0
    gaps: List[BackupGapRecord] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_time": self.check_time,
            "total_tables": self.total_tables,
            "tables_checked": self.tables_checked,
            "gaps": [
                {
                    "table_name": g.table_name,
                    "gap_type": g.gap_type,
                    "description": g.description,
                    "expected_count": g.expected_count,
                    "actual_count": g.actual_count,
                    "gap_size": g.gap_size,
                    "sample_ids": g.sample_ids,
                    "severity": g.severity,
                }
                for g in self.gaps
            ],
            "summary": self.summary,
        }


class BackupChecker:
    def __init__(self, db):
        self.db = db

    def check_id_gaps(self, schema: str, table: str, id_column: str = "id") -> BackupGapRecord:
        sql = f"SELECT MIN(`{id_column}`) as min_id, MAX(`{id_column}`) as max_id, COUNT(*) as cnt FROM `{schema}`.`{table}`"
        row = self.db.execute_one(sql)
        if not row or row["cnt"] == 0:
            return BackupGapRecord(
                table_name=table,
                gap_type="empty",
                description="表为空或无数据",
                severity="low",
            )

        min_id = row["min_id"]
        max_id = row["max_id"]
        actual_count = row["cnt"]
        expected_count = max_id - min_id + 1 if min_id == int(min_id) else 0
        gap_size = expected_count - actual_count

        sample_ids = []
        if gap_size > 0:
            gap_sql = f"""
                SELECT t1.`{id_column}` + 1 AS gap_start
                FROM `{schema}`.`{table}` t1
                LEFT JOIN `{schema}`.`{table}` t2 ON t1.`{id_column}` + 1 = t2.`{id_column}`
                WHERE t2.`{id_column}` IS NULL
                  AND t1.`{id_column}` < (SELECT MAX(`{id_column}`) FROM `{schema}`.`{table}`)
                ORDER BY t1.`{id_column}`
                LIMIT 10
            """
            try:
                gap_rows = self.db.execute(gap_sql)
                sample_ids = [r["gap_start"] for r in gap_rows[:5]]
            except Exception:
                pass

        severity = "low"
        if gap_size > 0:
            if gap_size > expected_count * 0.1:
                severity = "high"
            elif gap_size > expected_count * 0.05:
                severity = "medium"

        return BackupGapRecord(
            table_name=table,
            gap_type="id_gap",
            description=f"ID 范围 {min_id}~{max_id}，应有 {expected_count} 条，实有 {actual_count} 条，缺口 {gap_size} 条",
            expected_count=expected_count,
            actual_count=actual_count,
            gap_size=gap_size,
            sample_ids=sample_ids,
            severity=severity,
        )

    def check_referenced_integrity(self, schema: str, fks: list) -> List[BackupGapRecord]:
        gaps = []
        for fk in fks:
            sql = f"""
                SELECT COUNT(*) AS cnt
                FROM `{schema}`.`{fk.table_name}` t
                LEFT JOIN `{schema}`.`{fk.referenced_table_name}` r
                  ON t.`{fk.column_name}` = r.`{fk.referenced_column_name}`
                WHERE r.`{fk.referenced_column_name}` IS NULL
                  AND t.`{fk.column_name}` IS NOT NULL
            """
            row = self.db.execute_one(sql)
            cnt = row["cnt"] if row else 0
            if cnt > 0:
                gaps.append(BackupGapRecord(
                    table_name=fk.table_name,
                    gap_type="broken_fk",
                    description=f"外键 {fk.column_name} 有 {cnt} 条记录引用不存在的 {fk.referenced_table_name}",
                    expected_count=0,
                    actual_count=cnt,
                    gap_size=cnt,
                    severity="high",
                ))
        return gaps

    def run_backup_check(self, schema: str, tables: List[str], fks: list = None) -> BackupCheckResult:
        result = BackupCheckResult()
        result.check_time = datetime.now().isoformat()
        result.total_tables = len(tables)

        for table in tables:
            try:
                gap = self.check_id_gaps(schema, table)
                if gap.gap_size > 0:
                    result.gaps.append(gap)
                result.tables_checked += 1
            except Exception as e:
                result.gaps.append(BackupGapRecord(
                    table_name=table,
                    gap_type="error",
                    description=f"检查失败: {str(e)}",
                    severity="high",
                ))

        if fks:
            fk_gaps = self.check_referenced_integrity(schema, fks)
            result.gaps.extend(fk_gaps)

        high_count = sum(1 for g in result.gaps if g.severity == "high")
        medium_count = sum(1 for g in result.gaps if g.severity == "medium")
        result.summary = f"发现 {len(result.gaps)} 个备份缺口，其中高危 {high_count} 个，中危 {medium_count} 个"

        return result

    def compare_results(self, old: BackupCheckResult, new: BackupCheckResult) -> Dict[str, Any]:
        old_gap_keys = {(g.table_name, g.gap_type) for g in old.gaps}
        new_gap_keys = {(g.table_name, g.gap_type) for g in new.gaps}

        added = [g for g in new.gaps if (g.table_name, g.gap_type) not in old_gap_keys]
        removed = [g for g in old.gaps if (g.table_name, g.gap_type) not in new_gap_keys]

        changed = []
        old_gap_map = {(g.table_name, g.gap_type): g for g in old.gaps}
        for g in new.gaps:
            key = (g.table_name, g.gap_type)
            if key in old_gap_map:
                old_g = old_gap_map[key]
                if old_g.gap_size != g.gap_size:
                    changed.append({
                        "table_name": g.table_name,
                        "gap_type": g.gap_type,
                        "old_size": old_g.gap_size,
                        "new_size": g.gap_size,
                        "diff": g.gap_size - old_g.gap_size,
                    })

        return {
            "added": added,
            "removed": removed,
            "changed": changed,
            "old_total": len(old.gaps),
            "new_total": len(new.gaps),
            "old_summary": old.summary,
            "new_summary": new.summary,
        }

    def save_result(self, result: BackupCheckResult, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

    def load_result(self, filepath: str) -> BackupCheckResult:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        result = BackupCheckResult(
            check_time=data.get("check_time", ""),
            total_tables=data.get("total_tables", 0),
            tables_checked=data.get("tables_checked", 0),
            summary=data.get("summary", ""),
        )
        for g in data.get("gaps", []):
            result.gaps.append(BackupGapRecord(
                table_name=g["table_name"],
                gap_type=g["gap_type"],
                description=g["description"],
                expected_count=g.get("expected_count", 0),
                actual_count=g.get("actual_count", 0),
                gap_size=g.get("gap_size", 0),
                sample_ids=g.get("sample_ids", []),
                severity=g.get("severity", "medium"),
            ))
        return result
