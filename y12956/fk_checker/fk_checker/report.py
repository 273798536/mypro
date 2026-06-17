import json
import os
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from tabulate import tabulate

from .core import CheckResult, BrokenLinkRecord


@dataclass
class ReportSnapshot:
    snapshot_id: str
    created_at: str
    schema_name: str
    fk_total: int
    broken_count: int
    total_broken_rows: int
    broken_links: List[Dict[str, Any]] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "created_at": self.created_at,
            "schema_name": self.schema_name,
            "fk_total": self.fk_total,
            "broken_count": self.broken_count,
            "total_broken_rows": self.total_broken_rows,
            "broken_links": self.broken_links,
            "notes": self.notes,
        }


class ReportManager:
    def __init__(self, storage_path: str = "./reports"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def create_snapshot(self, schema: str, check_result: CheckResult, notes: str = "") -> ReportSnapshot:
        import time
        timestamp = int(time.time() * 1000)
        snapshot_id = f"{schema}_{timestamp}"
        if os.path.exists(os.path.join(self.storage_path, f"{snapshot_id}.json")):
            i = 1
            while os.path.exists(os.path.join(self.storage_path, f"{snapshot_id}_{i}.json")):
                i += 1
            snapshot_id = f"{snapshot_id}_{i}"
        broken_links = []
        for bl in check_result.broken_links:
            broken_links.append({
                "table_name": bl.table_name,
                "column_name": bl.column_name,
                "referenced_table": bl.referenced_table,
                "referenced_column": bl.referenced_column,
                "broken_value": str(bl.broken_value),
                "broken_count": bl.broken_count,
                "sample_ids": [str(s) for s in bl.sample_ids],
            })

        snapshot = ReportSnapshot(
            snapshot_id=snapshot_id,
            created_at=datetime.now().isoformat(),
            schema_name=schema,
            fk_total=check_result.fk_total,
            broken_count=check_result.broken_count,
            total_broken_rows=check_result.total_broken_rows,
            broken_links=broken_links,
            notes=notes,
        )

        filepath = os.path.join(self.storage_path, f"{snapshot_id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(snapshot.to_dict(), f, ensure_ascii=False, indent=2)

        return snapshot

    def load_snapshot(self, snapshot_id: str) -> Optional[ReportSnapshot]:
        filepath = os.path.join(self.storage_path, f"{snapshot_id}.json")
        if not os.path.exists(filepath):
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ReportSnapshot(
            snapshot_id=data["snapshot_id"],
            created_at=data["created_at"],
            schema_name=data["schema_name"],
            fk_total=data["fk_total"],
            broken_count=data["broken_count"],
            total_broken_rows=data["total_broken_rows"],
            broken_links=data.get("broken_links", []),
            notes=data.get("notes", ""),
        )

    def list_snapshots(self, schema: Optional[str] = None) -> List[ReportSnapshot]:
        snapshots = []
        for filename in os.listdir(self.storage_path):
            if filename.endswith(".json"):
                snapshot_id = filename[:-5]
                try:
                    snap = self.load_snapshot(snapshot_id)
                    if snap and (schema is None or snap.schema_name == schema):
                        snapshots.append(snap)
                except Exception:
                    pass
        return sorted(snapshots, key=lambda s: s.created_at, reverse=True)

    def compare_snapshots(self, old_id: str, new_id: str) -> Dict[str, Any]:
        old_snap = self.load_snapshot(old_id)
        new_snap = self.load_snapshot(new_id)
        if not old_snap or not new_snap:
            raise ValueError("快照不存在")

        old_keys = {(bl["table_name"], bl["column_name"]) for bl in old_snap.broken_links}
        new_keys = {(bl["table_name"], bl["column_name"]) for bl in new_snap.broken_links}

        added_keys = new_keys - old_keys
        removed_keys = old_keys - new_keys
        common_keys = old_keys & new_keys

        old_map = {(bl["table_name"], bl["column_name"]): bl for bl in old_snap.broken_links}
        new_map = {(bl["table_name"], bl["column_name"]): bl for bl in new_snap.broken_links}

        changed = []
        for key in common_keys:
            old_bl = old_map[key]
            new_bl = new_map[key]
            if old_bl["broken_count"] != new_bl["broken_count"]:
                changed.append({
                    "table_name": key[0],
                    "column_name": key[1],
                    "old_count": old_bl["broken_count"],
                    "new_count": new_bl["broken_count"],
                    "diff": new_bl["broken_count"] - old_bl["broken_count"],
                })

        added = [new_map[k] for k in added_keys]
        removed = [old_map[k] for k in removed_keys]

        return {
            "old": old_snap.to_dict(),
            "new": new_snap.to_dict(),
            "summary": {
                "old_broken_count": old_snap.broken_count,
                "new_broken_count": new_snap.broken_count,
                "old_total_rows": old_snap.total_broken_rows,
                "new_total_rows": new_snap.total_broken_rows,
                "added_count": len(added),
                "removed_count": len(removed),
                "changed_count": len(changed),
            },
            "added": added,
            "removed": removed,
            "changed": changed,
        }

    def format_side_by_side(self, old_id: str, new_id: str, output_format: str = "table") -> str:
        comp = self.compare_snapshots(old_id, new_id)
        s = comp["summary"]

        lines = []
        lines.append("=" * 80)
        lines.append(f"  外键断链对比报告")
        lines.append("=" * 80)
        lines.append("")
        lines.append(f"  旧快照: {old_id}  ({comp['old']['created_at']})")
        lines.append(f"  新快照: {new_id}  ({comp['new']['created_at']})")
        lines.append("")

        summary_table = [
            ["指标", "旧值", "新值", "变化"],
            ["断链外键数", s["old_broken_count"], s["new_broken_count"],
             f"{s['new_broken_count'] - s['old_broken_count']:+d}"],
            ["断链总记录数", s["old_total_rows"], s["new_total_rows"],
             f"{s['new_total_rows'] - s['old_total_rows']:+d}"],
            ["新增断链", "-", "-", s["added_count"]],
            ["已修复断链", "-", "-", s["removed_count"]],
            ["数量变化的断链", "-", "-", s["changed_count"]],
        ]
        lines.append(tabulate(summary_table, headers="firstrow", tablefmt="grid"))
        lines.append("")

        if comp["added"]:
            lines.append("-" * 80)
            lines.append("  [新增的断链]")
            lines.append("-" * 80)
            added_table = [["表名", "字段", "引用表", "断链数"]]
            for bl in comp["added"]:
                added_table.append([
                    bl["table_name"],
                    bl["column_name"],
                    bl["referenced_table"],
                    bl["broken_count"],
                ])
            lines.append(tabulate(added_table, headers="firstrow", tablefmt="simple"))
            lines.append("")

        if comp["removed"]:
            lines.append("-" * 80)
            lines.append("  [已修复的断链]")
            lines.append("-" * 80)
            removed_table = [["表名", "字段", "引用表", "原断链数"]]
            for bl in comp["removed"]:
                removed_table.append([
                    bl["table_name"],
                    bl["column_name"],
                    bl["referenced_table"],
                    bl["broken_count"],
                ])
            lines.append(tabulate(removed_table, headers="firstrow", tablefmt="simple"))
            lines.append("")

        if comp["changed"]:
            lines.append("-" * 80)
            lines.append("  [数量变化的断链]")
            lines.append("-" * 80)
            changed_table = [["表名", "字段", "旧断链数", "新断链数", "变化"]]
            for c in comp["changed"]:
                changed_table.append([
                    c["table_name"],
                    c["column_name"],
                    c["old_count"],
                    c["new_count"],
                    f"{c['diff']:+d}",
                ])
            lines.append(tabulate(changed_table, headers="firstrow", tablefmt="simple"))
            lines.append("")

        lines.append("=" * 80)
        lines.append(f"  结论: 断链数 {'增加' if s['new_broken_count'] > s['old_broken_count'] else '减少' if s['new_broken_count'] < s['old_broken_count'] else '无变化'}")
        lines.append("=" * 80)

        return "\n".join(lines)
