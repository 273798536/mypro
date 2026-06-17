"""Schema 对比工具

对比基线 Schema 和当前 Schema 的差异，包括：
- 新增/删除表
- 字段变化（新增、删除、类型变更）
- 索引变化（新增、删除、列变更）
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from parser.schema_parser import TableInfo, ColumnInfo, IndexInfo


@dataclass
class ColumnDiff:
    column_name: str
    change_type: str  # added, removed, modified
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: List[str] = field(default_factory=list)


@dataclass
class IndexDiff:
    index_name: str
    change_type: str  # added, removed, modified
    old_columns: List[str] = field(default_factory=list)
    new_columns: List[str] = field(default_factory=list)


@dataclass
class TableDiff:
    table_name: str
    change_type: str  # added, removed, modified
    column_diffs: List[ColumnDiff] = field(default_factory=list)
    index_diffs: List[IndexDiff] = field(default_factory=list)
    source_old_line: int = 0
    source_new_line: int = 0

    @property
    def has_changes(self) -> bool:
        return len(self.column_diffs) > 0 or len(self.index_diffs) > 0


class SchemaDiff:
    """Schema 对比器"""

    def __init__(self, baseline_tables: Dict[str, TableInfo], current_tables: Dict[str, TableInfo]):
        self.baseline = baseline_tables
        self.current = current_tables

    def compare(self) -> dict:
        """对比两个 Schema，返回完整差异结果"""
        added_tables = []
        removed_tables = []
        modified_tables = []

        baseline_names = set(self.baseline.keys())
        current_names = set(self.current.keys())

        for name in current_names - baseline_names:
            tbl = self.current[name]
            added_tables.append(TableDiff(
                table_name=name,
                change_type="added",
                source_new_line=tbl.start_line,
            ))

        for name in baseline_names - current_names:
            tbl = self.baseline[name]
            removed_tables.append(TableDiff(
                table_name=name,
                change_type="removed",
                source_old_line=tbl.start_line,
            ))

        for name in baseline_names & current_names:
            base_tbl = self.baseline[name]
            curr_tbl = self.current[name]
            diff = self._compare_table(base_tbl, curr_tbl)
            if diff.has_changes:
                modified_tables.append(diff)

        return {
            "added_tables": added_tables,
            "removed_tables": removed_tables,
            "modified_tables": modified_tables,
            "total_changes": len(added_tables) + len(removed_tables) + len(modified_tables),
        }

    def _compare_table(self, base_tbl: TableInfo, curr_tbl: TableInfo) -> TableDiff:
        diff = TableDiff(
            table_name=base_tbl.name,
            change_type="modified",
            source_old_line=base_tbl.start_line,
            source_new_line=curr_tbl.start_line,
        )

        base_cols = {c.name: c for c in base_tbl.columns}
        curr_cols = {c.name: c for c in curr_tbl.columns}
        base_col_names = set(base_cols.keys())
        curr_col_names = set(curr_cols.keys())

        for name in curr_col_names - base_col_names:
            col = curr_cols[name]
            diff.column_diffs.append(ColumnDiff(
                column_name=name,
                change_type="added",
                new_value=col.data_type,
                details=[f"新增字段 {col.data_type}"],
            ))

        for name in base_col_names - curr_col_names:
            col = base_cols[name]
            diff.column_diffs.append(ColumnDiff(
                column_name=name,
                change_type="removed",
                old_value=col.data_type,
                details=[f"删除字段 {col.data_type}"],
            ))

        for name in base_col_names & curr_col_names:
            base_col = base_cols[name]
            curr_col = curr_cols[name]
            col_diff = self._compare_column(base_col, curr_col)
            if col_diff:
                diff.column_diffs.append(col_diff)

        base_idx = {idx.name: idx for idx in base_tbl.indexes}
        curr_idx = {idx.name: idx for idx in curr_tbl.indexes}
        base_idx_names = set(base_idx.keys())
        curr_idx_names = set(curr_idx.keys())

        for name in curr_idx_names - base_idx_names:
            idx = curr_idx[name]
            diff.index_diffs.append(IndexDiff(
                index_name=name,
                change_type="added",
                new_columns=idx.columns,
            ))

        for name in base_idx_names - curr_idx_names:
            idx = base_idx[name]
            diff.index_diffs.append(IndexDiff(
                index_name=name,
                change_type="removed",
                old_columns=idx.columns,
            ))

        for name in base_idx_names & curr_idx_names:
            b_idx = base_idx[name]
            c_idx = curr_idx[name]
            if b_idx.columns != c_idx.columns or b_idx.index_type != c_idx.index_type:
                diff.index_diffs.append(IndexDiff(
                    index_name=name,
                    change_type="modified",
                    old_columns=b_idx.columns,
                    new_columns=c_idx.columns,
                ))

        return diff

    def _compare_column(self, base_col: ColumnInfo, curr_col: ColumnInfo) -> Optional[ColumnDiff]:
        details = []

        if base_col.data_type != curr_col.data_type:
            details.append(f"类型变更: {base_col.data_type} → {curr_col.data_type}")

        if base_col.nullable != curr_col.nullable:
            details.append(f"可空性变更: {'NULL' if base_col.nullable else 'NOT NULL'} → {'NULL' if curr_col.nullable else 'NOT NULL'}")

        if base_col.default != curr_col.default:
            details.append(f"默认值变更: {base_col.default} → {curr_col.default}")

        if details:
            return ColumnDiff(
                column_name=base_col.name,
                change_type="modified",
                old_value=base_col.data_type,
                new_value=curr_col.data_type,
                details=details,
            )
        return None

    def summary_text(self, diff_result: dict) -> str:
        """生成对比摘要文本"""
        lines = []
        added = diff_result["added_tables"]
        removed = diff_result["removed_tables"]
        modified = diff_result["modified_tables"]

        if added:
            lines.append(f"【新增表 {len(added)} 张】")
            for t in added:
                lines.append(f"  + {t.table_name}")

        if removed:
            lines.append(f"【删除表 {len(removed)} 张】")
            for t in removed:
                lines.append(f"  - {t.table_name}")

        if modified:
            lines.append(f"【结构变更 {len(modified)} 张表】")
            for t in modified:
                col_changes = len(t.column_diffs)
                idx_changes = len(t.index_diffs)
                lines.append(f"  ~ {t.table_name} ({col_changes} 字段变更, {idx_changes} 索引变更)")
                for cd in t.column_diffs[:3]:
                    lines.append(f"    · {cd.change_type}: {cd.column_name}")
                if len(t.column_diffs) > 3:
                    lines.append(f"    · 还有 {len(t.column_diffs) - 3} 项字段变更...")

        if not lines:
            lines.append("Schema 无差异")

        return "\n".join(lines)
