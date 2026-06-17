"""备份校验模块

校验备份 Schema 与当前 Schema 的一致性，
保留完整来源信息（行号、文件名），确保结论可追溯。
"""

import os
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from parser.schema_parser import TableInfo, ColumnInfo


@dataclass
class TableValidationResult:
    table_name: str
    status: str  # matched, mismatch, missing_in_backup, missing_in_current
    backup_source: str = ""
    current_source: str = ""
    details: List[str] = field(default_factory=list)
    matched_columns: int = 0
    total_columns: int = 0
    matched_indexes: int = 0
    total_indexes: int = 0


@dataclass
class BackupValidationResult:
    backup_file: str
    current_file: str
    backup_table_count: int
    current_table_count: int
    matched_tables: List[TableValidationResult] = field(default_factory=list)
    mismatched_tables: List[TableValidationResult] = field(default_factory=list)
    missing_backup: List[TableValidationResult] = field(default_factory=list)
    missing_current: List[TableValidationResult] = field(default_factory=list)
    match_rate: float = 0.0

    @property
    def total_tables(self) -> int:
        return (
            len(self.matched_tables)
            + len(self.mismatched_tables)
            + len(self.missing_backup)
            + len(self.missing_current)
        )


class BackupValidator:
    """备份校验器 - 确保备份与当前状态一致，且可追溯"""

    def __init__(
        self,
        backup_tables: Dict[str, TableInfo],
        current_tables: Dict[str, TableInfo],
        backup_file: str,
        current_file: str,
    ):
        self.backup_tables = backup_tables
        self.current_tables = current_tables
        self.backup_file = backup_file
        self.current_file = current_file

    def validate(self) -> dict:
        """执行备份校验"""
        result = BackupValidationResult(
            backup_file=self.backup_file,
            current_file=self.current_file,
            backup_table_count=len(self.backup_tables),
            current_table_count=len(self.current_tables),
        )

        backup_names = set(self.backup_tables.keys())
        current_names = set(self.current_tables.keys())

        for name in backup_names - current_names:
            tbl = self.backup_tables[name]
            result.missing_current.append(TableValidationResult(
                table_name=name,
                status="missing_in_current",
                backup_source=f"{os.path.basename(self.backup_file)}:L{tbl.start_line}",
                details=["备份中有此表，当前 Schema 中不存在"],
            ))

        for name in current_names - backup_names:
            tbl = self.current_tables[name]
            result.missing_backup.append(TableValidationResult(
                table_name=name,
                status="missing_in_backup",
                current_source=f"{os.path.basename(self.current_file)}:L{tbl.start_line}",
                details=["当前 Schema 中有此表，备份中不存在"],
            ))

        matched_count = 0
        for name in backup_names & current_names:
            backup_tbl = self.backup_tables[name]
            current_tbl = self.current_tables[name]
            table_result = self._validate_table(name, backup_tbl, current_tbl)
            if table_result.status == "matched":
                result.matched_tables.append(table_result)
                matched_count += 1
            else:
                result.mismatched_tables.append(table_result)

        total_compared = len(result.matched_tables) + len(result.mismatched_tables)
        if total_compared > 0:
            result.match_rate = (len(result.matched_tables) / total_compared) * 100
        else:
            result.match_rate = 0.0

        return {
            "backup_table_count": result.backup_table_count,
            "current_table_count": result.current_table_count,
            "match_rate": result.match_rate,
            "matched_tables": result.matched_tables,
            "mismatched_tables": result.mismatched_tables,
            "missing_in_backup": result.missing_backup,
            "missing_in_current": result.missing_current,
            "backup_file": self.backup_file,
            "current_file": self.current_file,
            "can_trust": result.match_rate >= 90.0,
            "total_compared": total_compared,
        }

    def _validate_table(
        self, name: str, backup_tbl: TableInfo, current_tbl: TableInfo
    ) -> TableValidationResult:
        result = TableValidationResult(
            table_name=name,
            status="matched",
            backup_source=f"{os.path.basename(self.backup_file)}:L{backup_tbl.start_line}-L{backup_tbl.end_line}",
            current_source=f"{os.path.basename(self.current_file)}:L{current_tbl.start_line}-L{current_tbl.end_line}",
            total_columns=len(current_tbl.columns),
            total_indexes=len(current_tbl.indexes),
        )

        backup_cols = {c.name: c for c in backup_tbl.columns}
        current_cols = {c.name: c for c in current_tbl.columns}

        matched_cols = 0
        for col_name, curr_col in current_cols.items():
            back_col = backup_cols.get(col_name)
            if back_col and back_col.data_type == curr_col.data_type and back_col.nullable == curr_col.nullable:
                matched_cols += 1
            else:
                if back_col:
                    result.details.append(
                        f"字段 {col_name} 不一致: 备份={back_col.data_type}, 当前={curr_col.data_type} "
                        f"[备份:L{back_col.source_line}, 当前:L{curr_col.source_line}]"
                    )
                else:
                    result.details.append(
                        f"字段 {col_name} 仅在当前 Schema 中存在 [当前:L{curr_col.source_line}]"
                    )

        for col_name in backup_cols:
            if col_name not in current_cols:
                back_col = backup_cols[col_name]
                result.details.append(
                    f"字段 {col_name} 仅在备份中存在 [备份:L{back_col.source_line}]"
                )

        result.matched_columns = matched_cols

        backup_idx = {idx.name: idx for idx in backup_tbl.indexes}
        current_idx = {idx.name: idx for idx in current_tbl.indexes}

        matched_idx = 0
        for idx_name, curr_idx in current_idx.items():
            back_idx = backup_idx.get(idx_name)
            if back_idx and back_idx.columns == curr_idx.columns and back_idx.index_type == curr_idx.index_type:
                matched_idx += 1
            else:
                if back_idx:
                    result.details.append(
                        f"索引 {idx_name} 不一致: 备份列={back_idx.columns}, 当前列={curr_idx.columns} "
                        f"[备份:L{back_idx.source_line}, 当前:L{curr_idx.source_line}]"
                    )
                else:
                    result.details.append(
                        f"索引 {idx_name} 仅在当前 Schema 中存在 [当前:L{curr_idx.source_line}]"
                    )

        for idx_name in backup_idx:
            if idx_name not in current_idx:
                back_idx = backup_idx[idx_name]
                result.details.append(
                    f"索引 {idx_name} 仅在备份中存在 [备份:L{back_idx.source_line}]"
                )

        result.matched_indexes = matched_idx

        if result.details:
            result.status = "mismatch"

        return result

    def generate_checksum(self, tables: Dict[str, TableInfo]) -> str:
        """生成 Schema 校验和，用于快速比对"""
        content_parts = []
        for name in sorted(tables.keys()):
            tbl = tables[name]
            col_desc = ";".join([f"{c.name}:{c.data_type}:{c.nullable}" for c in tbl.columns])
            idx_desc = ";".join([f"{idx.name}:{idx.index_type}:{','.join(idx.columns)}" for idx in tbl.indexes])
            content_parts.append(f"{name}|{col_desc}|{idx_desc}")

        full_content = "\n".join(content_parts)
        return hashlib.md5(full_content.encode("utf-8")).hexdigest()

    def validation_summary(self, result: dict) -> str:
        """生成校验摘要文本"""
        lines = []
        lines.append(f"备份文件: {os.path.basename(result['backup_file'])}")
        lines.append(f"当前文件: {os.path.basename(result['current_file'])}")
        lines.append(f"备份表数: {result['backup_table_count']}")
        lines.append(f"当前表数: {result['current_table_count']}")
        lines.append(f"匹配率: {result['match_rate']:.1f}%")
        lines.append("")

        if result["matched_tables"]:
            lines.append(f"【完全匹配 {len(result['matched_tables'])} 张表】")
            for t in result["matched_tables"][:5]:
                lines.append(f"  ✓ {t.table_name}  (字段:{t.matched_columns}/{t.total_columns}, 索引:{t.matched_indexes}/{t.total_indexes})")
            if len(result["matched_tables"]) > 5:
                lines.append(f"  ...还有 {len(result['matched_tables']) - 5} 张")

        if result["mismatched_tables"]:
            lines.append(f"【存在差异 {len(result['mismatched_tables'])} 张表】")
            for t in result["mismatched_tables"]:
                lines.append(f"  ⚠ {t.table_name}  ({len(t.details)} 处差异)")

        if result["missing_in_backup"]:
            lines.append(f"【备份缺失 {len(result['missing_in_backup'])} 张表】")
            for t in result["missing_in_backup"]:
                lines.append(f"  ? {t.table_name}")

        if result["missing_in_current"]:
            lines.append(f"【当前缺失 {len(result['missing_in_current'])} 张表】")
            for t in result["missing_in_current"]:
                lines.append(f"  ! {t.table_name}")

        return "\n".join(lines)
