"""并排对比报告生成器。

生成旧结论与新结论的并排对比报告，让后端负责人不用猜影响范围。
支持纯文本和 Markdown 两种格式。
"""
import os
from typing import Optional

from ..config import get_config
from ..snapshot import Snapshot, compare_snapshots, compare_side_by_side
from ..snapshot.storage import SnapshotStorage
from ..migration.history import MigrationHistory
from ..analysis.slow_query import SlowQueryAnalyzer
from ..analysis.lock_wait import LockWaitAnalyzer


class ReportGenerator:
    """报告生成器。"""

    def __init__(self, output_dir: Optional[str] = None):
        cfg = get_config()
        self.output_dir = output_dir or os.path.join(cfg.output_dir, "reports")
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_snapshot_report(
        self,
        snapshot_name: str,
        old_version: str,
        new_version: str,
        format: str = "text",
    ) -> str:
        """生成快照并排对比报告，返回报告文件路径。"""
        storage = SnapshotStorage()
        old_snap = storage.load(snapshot_name, old_version)
        new_snap = storage.load(snapshot_name, new_version)

        if old_snap is None or new_snap is None:
            raise ValueError(f"快照不存在: {snapshot_name} v{old_version} / v{new_version}")

        diff = compare_snapshots(old_snap, new_snap)
        side_text = compare_side_by_side(old_snap, new_snap, diff)

        summary = self._build_summary_section(old_snap, new_snap, diff)

        if format == "markdown":
            report = self._to_markdown(summary, side_text, diff)
            filename = f"{snapshot_name}_v{old_version}_vs_v{new_version}.md"
        else:
            report = summary + "\n\n" + side_text
            filename = f"{snapshot_name}_v{old_version}_vs_v{new_version}.txt"

        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(report)

        return path

    def _build_summary_section(self, old: Snapshot, new: Snapshot, diff) -> str:
        """构建摘要部分。"""
        lines = []
        lines.append("快照对比摘要")
        lines.append("=" * 60)
        lines.append(f"快照名称: {old.name}")
        lines.append(f"旧版本: v{old.version}  ({old.created_at} by {old.created_by})")
        lines.append(f"新版本: v{new.version}  ({new.created_at} by {new.created_by})")
        lines.append(f"变更概要: {diff.change_summary}")
        lines.append("")

        if diff.tables_added:
            lines.append(f"新增表 ({len(diff.tables_added)}):")
            for t in diff.tables_added:
                lines.append(f"  + {t}")
            lines.append("")

        if diff.tables_removed:
            lines.append(f"删除表 ({len(diff.tables_removed)}):")
            for t in diff.tables_removed:
                lines.append(f"  - {t}")
            lines.append("")

        if diff.tables_modified:
            lines.append(f"修改表 ({len(diff.tables_modified)}):")
            for td in diff.tables_modified:
                col_changes = len(td.columns)
                idx_changes = len(td.indexes)
                row_change = (
                    f", 行数 {td.old_row_count}→{td.new_row_count}"
                    if td.row_count_changed
                    else ""
                )
                lines.append(f"  * {td.table}: {col_changes} 列变更, {idx_changes} 索引变更{row_change}")
            lines.append("")

        return "\n".join(lines)

    def _to_markdown(self, summary: str, side_text: str, diff) -> str:
        """转成 Markdown 格式。"""
        lines = []
        lines.append(f"# 快照对比报告")
        lines.append("")
        lines.append("## 摘要")
        lines.append("")
        for line in summary.split("\n")[2:]:
            if line.strip() == "":
                lines.append("")
            elif line.startswith("="):
                continue
            elif line.startswith("  + "):
                lines.append(f"- **新增**: `{line[4:]}`")
            elif line.startswith("  - "):
                lines.append(f"- **删除**: `{line[4:]}`")
            elif line.startswith("  * "):
                lines.append(f"- **修改**: {line[4:]}")
            elif line.startswith("快照名称"):
                lines.append(f"- {line}")
            elif line.startswith("旧版本") or line.startswith("新版本") or line.startswith("变更概要"):
                lines.append(f"- {line}")
            elif line.endswith("):"):
                lines.append(f"### {line}")
            else:
                lines.append(line)
        lines.append("")
        lines.append("## 详细对比")
        lines.append("")
        lines.append("```")
        lines.append(side_text)
        lines.append("```")
        return "\n".join(lines)

    def generate_migration_status_report(
        self,
        format: str = "text",
    ) -> str:
        """生成迁移状态总览报告。"""
        history = MigrationHistory()
        slow_analyzer = SlowQueryAnalyzer()
        lock_analyzer = LockWaitAnalyzer()

        statuses = history.list_all_status()
        batches = history.list_batches()

        lines = []
        lines.append("=" * 80)
        lines.append("迁移状态总览报告")
        lines.append("=" * 80)
        lines.append("")

        lines.append(f"迁移总数: {len(statuses)}")
        success = sum(1 for s in statuses if s["current_status"] == "success")
        failed = sum(1 for s in statuses if s["current_status"] == "failed")
        lines.append(f"成功: {success}  失败: {failed}")
        lines.append("")

        lines.append("批次概览:")
        for b in batches[:5]:
            lines.append(
                f"  {b['batch_id']}: 共{b['total_count']}个 "
                f"(成功{b['success_count']} 失败{b['failed_count']} 跳过{b['skipped_count']}) "
                f"- {b['started_at']}"
            )
        lines.append("")

        lines.append("-" * 80)
        lines.append("迁移详情")
        lines.append("-" * 80)
        lines.append("")

        for st in statuses:
            name = st["migration_name"]
            lines.append(f"【{name}】")
            lines.append(f"  当前状态: {st['current_status']}")

            if st["slow_query_cause"]:
                cause_info = f"  慢查询归因: {st['slow_query_cause']}"
                if st["previous_slow_query_cause"]:
                    cause_info += (
                        f"  (此前: {st['previous_slow_query_cause']}, "
                        f"由 {st['slow_query_cause_changed_by']} 于 {st['slow_query_cause_changed_at']} 修改)"
                    )
                lines.append(cause_info)

            if st["page_order_unstable"]:
                lines.append(
                    f"  分页顺序: 不稳定 (已复核, 复核人: {st['page_order_reviewed_by']}, "
                    f"时间: {st['page_order_reviewed_at']}, 原因: {st['page_order_review_reason']})"
                )

            lock_impact = lock_analyzer.assess_migration_impact(name)
            if lock_impact["has_lock_wait"]:
                lines.append(
                    f"  锁等待: 共 {lock_impact['event_count']} 次, "
                    f"总等待 {lock_impact['total_wait_seconds']}s, "
                    f"最高严重级: {lock_impact['max_severity']}"
                )
                lines.append(f"  影响评估: {lock_impact['impact_level']} - {lock_impact['recommendation']}")

            lines.append("")

        report = "\n".join(lines)

        if format == "markdown":
            report = self._status_report_to_md(report)
            filename = "migration_status.md"
        else:
            filename = "migration_status.txt"

        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(report)

        return path

    def _status_report_to_md(self, text: str) -> str:
        lines = ["# 迁移状态总览", ""]
        for line in text.split("\n"):
            if line.startswith("="):
                continue
            elif line.startswith("【") and line.endswith("】"):
                lines.append(f"## {line[1:-1]}")
            elif line.startswith("  "):
                lines.append(f"- {line.strip()}")
            elif line.strip() == "":
                lines.append("")
            else:
                lines.append(line)
        return "\n".join(lines)


def generate_snapshot_report(
    snapshot_name: str,
    old_version: str,
    new_version: str,
    format: str = "text",
) -> str:
    """快捷函数：生成快照对比报告。"""
    return ReportGenerator().generate_snapshot_report(
        snapshot_name, old_version, new_version, format
    )


def generate_migration_status_report(format: str = "text") -> str:
    """快捷函数：生成迁移状态报告。"""
    return ReportGenerator().generate_migration_status_report(format)
