"""快照对比器。

支持：
1. 结构化差异输出（新增/删除/修改的表、列、索引）
2. 并排对比报告（方便人工审阅影响范围）
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .collector import Snapshot, TableInfo, ColumnInfo, IndexInfo


@dataclass
class ColumnDiff:
    """列的差异。"""

    column: str
    change_type: str  # added, removed, modified
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    modified_fields: List[str] = field(default_factory=list)


@dataclass
class IndexDiff:
    """索引的差异。"""

    index: str
    change_type: str  # added, removed, modified
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None


@dataclass
class TableDiff:
    """表的差异。"""

    table: str
    change_type: str  # added, removed, modified
    columns: List[ColumnDiff] = field(default_factory=list)
    indexes: List[IndexDiff] = field(default_factory=list)
    row_count_changed: bool = False
    old_row_count: int = 0
    new_row_count: int = 0


@dataclass
class SnapshotDiffResult:
    """快照对比结果。"""

    old_snapshot: Snapshot
    new_snapshot: Snapshot
    tables_added: List[str] = field(default_factory=list)
    tables_removed: List[str] = field(default_factory=list)
    tables_modified: List[TableDiff] = field(default_factory=list)

    @property
    def has_changes(self) -> bool:
        return bool(
            self.tables_added or self.tables_removed or self.tables_modified
        )

    @property
    def change_summary(self) -> str:
        parts = []
        if self.tables_added:
            parts.append(f"新增表 {len(self.tables_added)} 个")
        if self.tables_removed:
            parts.append(f"删除表 {len(self.tables_removed)} 个")
        if self.tables_modified:
            parts.append(f"修改表 {len(self.tables_modified)} 个")
        return "，".join(parts) if parts else "无变化"


class SnapshotComparator:
    """快照对比器。"""

    def compare(self, old: Snapshot, new: Snapshot) -> SnapshotDiffResult:
        """对比两个快照。"""
        result = SnapshotDiffResult(old_snapshot=old, new_snapshot=new)

        old_tables = set(old.tables.keys())
        new_tables = set(new.tables.keys())

        result.tables_added = sorted(new_tables - old_tables)
        result.tables_removed = sorted(old_tables - new_tables)

        for tname in sorted(old_tables & new_tables):
            diff = self._compare_table(tname, old.tables[tname], new.tables[tname])
            if diff:
                result.tables_modified.append(diff)

        return result

    def _compare_table(
        self, name: str, old: TableInfo, new: TableInfo
    ) -> Optional[TableDiff]:
        diff = TableDiff(table=name, change_type="modified")

        old_cols = {c.name: c for c in old.columns}
        new_cols = {c.name: c for c in new.columns}
        old_col_names = set(old_cols.keys())
        new_col_names = set(new_cols.keys())

        for col in sorted(new_col_names - old_col_names):
            diff.columns.append(
                ColumnDiff(
                    column=col,
                    change_type="added",
                    new_value=self._col_to_dict(new_cols[col]),
                )
            )

        for col in sorted(old_col_names - new_col_names):
            diff.columns.append(
                ColumnDiff(
                    column=col,
                    change_type="removed",
                    old_value=self._col_to_dict(old_cols[col]),
                )
            )

        for col in sorted(old_col_names & new_col_names):
            oc = old_cols[col]
            nc = new_cols[col]
            modified = []
            if oc.type != nc.type:
                modified.append("type")
            if oc.nullable != nc.nullable:
                modified.append("nullable")
            if oc.default != nc.default:
                modified.append("default")
            if oc.pk != nc.pk:
                modified.append("pk")
            if modified:
                diff.columns.append(
                    ColumnDiff(
                        column=col,
                        change_type="modified",
                        old_value=self._col_to_dict(oc),
                        new_value=self._col_to_dict(nc),
                        modified_fields=modified,
                    )
                )

        old_idx = {idx.name: idx for idx in old.indexes}
        new_idx = {idx.name: idx for idx in new.indexes}
        old_idx_names = set(old_idx.keys())
        new_idx_names = set(new_idx.keys())

        for idx in sorted(new_idx_names - old_idx_names):
            diff.indexes.append(
                IndexDiff(
                    index=idx,
                    change_type="added",
                    new_value=self._idx_to_dict(new_idx[idx]),
                )
            )

        for idx in sorted(old_idx_names - new_idx_names):
            diff.indexes.append(
                IndexDiff(
                    index=idx,
                    change_type="removed",
                    old_value=self._idx_to_dict(old_idx[idx]),
                )
            )

        for idx in sorted(old_idx_names & new_idx_names):
            oi = old_idx[idx]
            ni = new_idx[idx]
            if oi.columns != ni.columns or oi.unique != ni.unique:
                diff.indexes.append(
                    IndexDiff(
                        index=idx,
                        change_type="modified",
                        old_value=self._idx_to_dict(oi),
                        new_value=self._idx_to_dict(ni),
                    )
                )

        if old.row_count != new.row_count:
            diff.row_count_changed = True
            diff.old_row_count = old.row_count
            diff.new_row_count = new.row_count

        if diff.columns or diff.indexes or diff.row_count_changed:
            return diff
        return None

    def _col_to_dict(self, col: ColumnInfo) -> dict:
        return {
            "name": col.name,
            "type": col.type,
            "nullable": col.nullable,
            "default": col.default,
            "pk": col.pk,
        }

    def _idx_to_dict(self, idx: IndexInfo) -> dict:
        return {
            "name": idx.name,
            "columns": idx.columns,
            "unique": idx.unique,
        }


def compare_snapshots(old: Snapshot, new: Snapshot) -> SnapshotDiffResult:
    return SnapshotComparator().compare(old, new)


def compare_side_by_side(
    old: Snapshot, new: Snapshot, diff: SnapshotDiffResult
) -> str:
    """生成并排对比报告（文字版）。"""
    lines = []
    lines.append("=" * 90)
    lines.append(f"快照并排对比: {old.name}  v{old.version}  →  v{new.version}")
    lines.append(f"旧快照: {old.created_at} by {old.created_by}")
    lines.append(f"新快照: {new.created_at} by {new.created_by}")
    lines.append("=" * 90)
    lines.append("")
    lines.append(f"变更概要: {diff.change_summary}")
    lines.append("")

    all_tables = sorted(set(old.tables.keys()) | set(new.tables.keys()))

    for tname in all_tables:
        old_tbl = old.tables.get(tname)
        new_tbl = new.tables.get(tname)

        if old_tbl and not new_tbl:
            lines.append(f"[-] 表 {tname} (已删除)")
            lines.append(f"    旧: {len(old_tbl.columns)} 列, {len(old_tbl.indexes)} 索引, {old_tbl.row_count} 行")
            lines.append("    新: (不存在)")
            lines.append("")
            continue

        if new_tbl and not old_tbl:
            lines.append(f"[+] 表 {tname} (新增)")
            lines.append(f"    旧: (不存在)")
            lines.append(f"    新: {len(new_tbl.columns)} 列, {len(new_tbl.indexes)} 索引, {new_tbl.row_count} 行")
            lines.append("")
            continue

        lines.append(f"[*] 表 {tname}")
        rows_label = (
            f"行数: {old_tbl.row_count} → {new_tbl.row_count}"
            if old_tbl.row_count != new_tbl.row_count
            else f"行数: {old_tbl.row_count}"
        )
        lines.append(f"    {rows_label}")
        lines.append("")

        col_width = 24
        lines.append(f"    {'列名'.ljust(col_width)} {'旧值'.ljust(20)} {'新值'.ljust(20)} 状态")
        lines.append(f"    {'-' * col_width} {'-' * 20} {'-' * 20} {'-' * 10}")

        all_cols = sorted(set(c.name for c in old_tbl.columns) | set(c.name for c in new_tbl.columns))
        old_cols = {c.name: c for c in old_tbl.columns}
        new_cols = {c.name: c for c in new_tbl.columns}

        for col in all_cols:
            oc = old_cols.get(col)
            nc = new_cols.get(col)

            if oc and not nc:
                old_desc = f"{oc.type}" + (" NOT NULL" if not oc.nullable else "")
                lines.append(f"    {col.ljust(col_width)} {old_desc.ljust(20)} {'(已删除)'.ljust(20)} REMOVED")
            elif nc and not oc:
                new_desc = f"{nc.type}" + (" NOT NULL" if not nc.nullable else "")
                lines.append(f"    {col.ljust(col_width)} {'(新增)'.ljust(20)} {new_desc.ljust(20)} ADDED")
            else:
                old_desc = f"{oc.type}" + (" NOT NULL" if not oc.nullable else "")
                new_desc = f"{nc.type}" + (" NOT NULL" if not nc.nullable else "")
                changed = oc.type != nc.type or oc.nullable != nc.nullable or oc.default != nc.default or oc.pk != nc.pk
                status = "MODIFIED" if changed else "unchanged"
                lines.append(f"    {col.ljust(col_width)} {old_desc.ljust(20)} {new_desc.ljust(20)} {status}")

        lines.append("")
        lines.append(f"    索引变更:")
        old_idx = {idx.name: idx for idx in old_tbl.indexes}
        new_idx = {idx.name: idx for idx in new_tbl.indexes}
        all_idx = sorted(set(old_idx.keys()) | set(new_idx.keys()))

        if not all_idx:
            lines.append("        (无索引)")
        else:
            for idx in all_idx:
                oi = old_idx.get(idx)
                ni = new_idx.get(idx)
                if oi and not ni:
                    lines.append(f"        [-] {idx} (已删除)")
                elif ni and not oi:
                    lines.append(f"        [+] {idx} (新增) unique={ni.unique} cols={ni.columns}")
                else:
                    same = oi.columns == ni.columns and oi.unique == ni.unique
                    mark = " " if same else "*"
                    lines.append(f"        {mark} {idx} unique={ni.unique} cols={ni.columns}")

        lines.append("")
        lines.append("-" * 90)
        lines.append("")

    return "\n".join(lines)
