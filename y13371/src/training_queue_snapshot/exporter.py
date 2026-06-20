import json
import csv
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd

from .models import (
    Snapshot, FeatureRow, VersionDiff,
    RowStatus, GrayFlag, ModificationType
)


class SnapshotExporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _get_row_display_status(self, row: FeatureRow) -> str:
        if row.status == RowStatus.BAD:
            return "坏行"
        elif row.status == RowStatus.SKIPPED:
            return "跳过"
        elif row.status == RowStatus.BOUNDARY:
            return "边界"
        else:
            return "已处理"

    def _get_gray_display(self, row: FeatureRow) -> str:
        if row.gray_flag == GrayFlag.GRAY_CANDIDATE:
            return "灰度候选"
        elif row.gray_flag == GrayFlag.GRAY_ENABLED:
            return "灰度生效"
        elif row.gray_flag == GrayFlag.GRAY_ERROR:
            return "灰度错误"
        else:
            return "正常"

    def _get_modification_display(self, row: FeatureRow) -> str:
        if row.modification_type == ModificationType.MANUAL_CORRECTION:
            return "人工修正"
        elif row.modification_type == ModificationType.AUTO_FIX:
            return "自动修复"
        elif row.modification_type == ModificationType.THRESHOLD_ADJUSTMENT:
            return "阈值调整"
        else:
            return "无"

    def export_json(self, snapshot: Snapshot, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"snapshot_{snapshot.snapshot_id}_{snapshot.version.version_id}.json"
        filepath = os.path.join(self.output_dir, filename)

        data = snapshot.to_dict()
        data["_export_meta"] = {
            "export_time": datetime.now().isoformat(),
            "exporter_version": "0.1.0",
            "status_display_mapping": {
                "processed": "已处理",
                "bad": "坏行",
                "skipped": "跳过",
                "boundary": "边界",
            },
            "gray_display_mapping": {
                "normal": "正常",
                "gray_candidate": "灰度候选",
                "gray_enabled": "灰度生效",
                "gray_error": "灰度错误",
            },
            "modification_display_mapping": {
                "none": "无",
                "manual_correction": "人工修正",
                "auto_fix": "自动修复",
                "threshold_adjustment": "阈值调整",
            },
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return filepath

    def export_csv(self, snapshot: Snapshot, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"snapshot_{snapshot.snapshot_id}_{snapshot.version.version_id}.csv"
        filepath = os.path.join(self.output_dir, filename)

        if not snapshot.rows:
            pd.DataFrame().to_csv(filepath, index=False, encoding="utf-8-sig")
            return filepath

        feature_cols = sorted({k for row in snapshot.rows for k in row.features.keys()})

        rows_data = []
        for row in snapshot.rows:
            row_data = {
                "sample_id": row.sample_id,
                "status": row.status.value,
                "状态显示": self._get_row_display_status(row),
                "gray_flag": row.gray_flag.value,
                "灰度标记": self._get_gray_display(row),
                "gray_ratio": row.gray_ratio,
                "modification_type": row.modification_type.value,
                "修改类型": self._get_modification_display(row),
                "modification_note": row.modification_note or "",
                "is_boundary": row.is_boundary,
                "是否边界样本": "是" if row.is_boundary else "否",
                "error_message": row.error_message or "",
                "source_version": row.source_version or "",
                "label": row.label if row.label is not None else "",
                "timestamp": row.timestamp.isoformat(),
            }

            for col in feature_cols:
                row_data[f"feature_{col}"] = row.features.get(col, "")

            rows_data.append(row_data)

        df = pd.DataFrame(rows_data)
        df.to_csv(filepath, index=False, encoding="utf-8-sig")

        return filepath

    def export_report(self, snapshot: Snapshot, filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"report_{snapshot.snapshot_id}_{snapshot.version.version_id}.md"
        filepath = os.path.join(self.output_dir, filename)

        stats = snapshot.stats
        version = snapshot.version

        lines = [
            f"# 训练队列版本快照报告",
            "",
            f"> 快照ID: {snapshot.snapshot_id}",
            f"> 版本ID: {version.version_id}",
            f"> 版本名称: {version.name}",
            f"> 生成时间: {snapshot.created_at.isoformat()}",
            f"> 源文件: {snapshot.source_file}",
            "",
            "## 一、处理统计",
            "",
            "| 指标 | 数值 | 占比 |",
            "|------|------|------|",
            f"| 总数 | {stats.total} | 100% |",
            f"| 已处理 | {stats.processed} | {stats.processed_rate:.2%} |",
            f"| 坏行 | {stats.bad} | {stats.bad_rate:.2%} |",
            f"| 跳过 | {stats.skipped} | {stats.skipped/stats.total:.2%} |",
            f"| 边界样本 | {stats.boundary} | {stats.boundary/stats.total:.2%} |",
            "",
            "## 二、灰度发布统计",
            "",
            f"灰度配置比例: {version.gray_ratio_config if version.gray_ratio_config is not None else '未配置'}",
            f"实际灰度比例: {stats.gray_rate:.2%}",
            "",
            "| 状态 | 数量 |",
            "|------|------|",
            f"| 灰度候选 | {stats.gray_candidate} |",
            f"| 灰度生效 | {stats.gray_enabled} |",
            f"| 灰度错误 | {stats.gray_error} |",
            f"| 正常 | {stats.total - stats.gray_candidate - stats.gray_enabled - stats.gray_error} |",
            "",
            "## 三、修改统计",
            "",
            "| 修改类型 | 数量 |",
            "|----------|------|",
            f"| 人工修正 | {stats.manual_corrections} |",
            f"| 自动修复 | {stats.auto_fixes} |",
            f"| 阈值调整 | {stats.threshold_adjustments} |",
            "",
            "## 四、特征指标",
            "",
            "| 特征 | 均值 | 标准差 | 最小值 | 最大值 | 缺失值 | 异常值 |",
            "|------|------|--------|--------|--------|--------|--------|",
        ]

        for feature in sorted(snapshot.metrics.mean_values.keys()):
            lines.append(
                f"| {feature} "
                f"| {snapshot.metrics.mean_values[feature]:.4f} "
                f"| {snapshot.metrics.std_values[feature]:.4f} "
                f"| {snapshot.metrics.min_values[feature]:.4f} "
                f"| {snapshot.metrics.max_values[feature]:.4f} "
                f"| {snapshot.metrics.null_counts[feature]} "
                f"| {snapshot.metrics.outlier_counts[feature]} |"
            )

        lines.extend([
            "",
            "## 五、坏行详情",
            "",
        ])

        bad_rows = [r for r in snapshot.rows if r.status == RowStatus.BAD]
        if bad_rows:
            lines.append("| sample_id | 错误原因 |")
            lines.append("|-----------|----------|")
            for row in bad_rows:
                lines.append(f"| {row.sample_id} | {row.error_message} |")
        else:
            lines.append("无坏行")

        lines.extend([
            "",
            "## 六、边界样本详情",
            "",
        ])

        boundary_rows = [r for r in snapshot.rows if r.is_boundary]
        if boundary_rows:
            lines.append("| sample_id | 特征预览 |")
            lines.append("|-----------|----------|")
            for row in boundary_rows:
                features_preview = ", ".join(
                    f"{k}={v:.2f}" for k, v in list(row.features.items())[:3]
                )
                lines.append(f"| {row.sample_id} | {features_preview}... |")
        else:
            lines.append("无边界样本")

        lines.extend([
            "",
            "## 七、人工修正详情",
            "",
        ])

        modified_rows = [r for r in snapshot.rows if r.modification_type != ModificationType.NONE]
        if modified_rows:
            lines.append("| sample_id | 修改类型 | 修改说明 |")
            lines.append("|-----------|----------|----------|")
            for row in modified_rows:
                lines.append(
                    f"| {row.sample_id} "
                    f"| {self._get_modification_display(row)} "
                    f"| {row.modification_note or ''} |"
                )
        else:
            lines.append("无修改记录")

        lines.extend([
            "",
            "## 八、灰度标记样本",
            "",
        ])

        gray_rows = [r for r in snapshot.rows if r.gray_flag != GrayFlag.NORMAL]
        if gray_rows:
            lines.append("| sample_id | 灰度状态 | 灰度比例 |")
            lines.append("|-----------|----------|----------|")
            for row in gray_rows:
                lines.append(
                    f"| {row.sample_id} "
                    f"| {self._get_gray_display(row)} "
                    f"| {row.gray_ratio:.2%} |"
                )
        else:
            lines.append("无灰度标记样本")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filepath

    def export_diff_report(
        self, diff: VersionDiff, filename: Optional[str] = None
    ) -> str:
        if filename is None:
            filename = f"diff_{diff.old_version_id}_vs_{diff.new_version_id}.md"
        filepath = os.path.join(self.output_dir, filename)

        lines = [
            f"# 版本对比报告",
            "",
            f"> 旧版本: {diff.old_version_id}",
            f"> 新版本: {diff.new_version_id}",
            f"> 生成时间: {datetime.now().isoformat()}",
            "",
            "## 一、样本变化",
            "",
        ]

        if diff.sample_changes:
            added = [c for c in diff.sample_changes if c["change_type"] == "added"]
            removed = [c for c in diff.sample_changes if c["change_type"] == "removed"]
            modified = [c for c in diff.sample_changes if c["change_type"] == "modified"]

            lines.append(f"新增样本: {len(added)} 个")
            lines.append(f"删除样本: {len(removed)} 个")
            lines.append(f"修改样本: {len(modified)} 个")
            lines.append("")

            if modified:
                lines.append("### 修改详情")
                lines.append("")
                lines.append("| sample_id | 状态变化 | 灰度变化 | 边界变化 | 修改类型 |")
                lines.append("|-----------|----------|----------|----------|----------|")
                for change in modified[:20]:
                    status_display = (
                        f"{change['old_status']} → {change['new_status']}"
                        if change["status_changed"] else "未变"
                    )
                    gray_display = (
                        f"{change['old_gray_flag']} → {change['new_gray_flag']}"
                        if change["gray_changed"] else "未变"
                    )
                    boundary_display = (
                        f"{change['old_is_boundary']} → {change['new_is_boundary']}"
                        if change["boundary_changed"] else "未变"
                    )
                    mod_display = (
                        f"{change['old_modification']} → {change['new_modification']}"
                        if change["modification_changed"] else "未变"
                    )
                    lines.append(
                        f"| {change['sample_id']} "
                        f"| {status_display} "
                        f"| {gray_display} "
                        f"| {boundary_display} "
                        f"| {mod_display} |"
                    )
                if len(modified) > 20:
                    lines.append(f"| ... (共 {len(modified)} 条修改) | | | | |")
        else:
            lines.append("无样本变化")

        lines.extend([
            "",
            "## 二、阈值变化",
            "",
        ])

        if diff.threshold_changes:
            lines.append("| 特征 | 变化类型 | 阈值变化 | 手动设置 |")
            lines.append("|------|----------|----------|----------|")
            for change in diff.threshold_changes:
                if change["change_type"] == "modified":
                    threshold_display = (
                        f"[{change['old_min']}, {change['old_max']}] → "
                        f"[{change['new_min']}, {change['new_max']}]"
                    )
                elif change["change_type"] == "added":
                    threshold_display = f"[{change['min_value']}, {change['max_value']}]"
                else:
                    threshold_display = f"[{change['min_value']}, {change['max_value']}]"
                manual_display = "是" if change.get("is_manual", False) else "否"
                lines.append(
                    f"| {change['feature_name']} "
                    f"| {change['change_type']} "
                    f"| {threshold_display} "
                    f"| {manual_display} |"
                )
        else:
            lines.append("无阈值变化")

        lines.extend([
            "",
            "## 三、人工修正",
            "",
        ])

        if diff.manual_corrections:
            lines.append("| sample_id | 修改类型 | 修改说明 |")
            lines.append("|-----------|----------|----------|")
            for corr in diff.manual_corrections:
                lines.append(
                    f"| {corr['sample_id']} "
                    f"| {corr['modification_type']} "
                    f"| {corr['modification_note'] or ''} |"
                )
        else:
            lines.append("无人工修正")

        lines.extend([
            "",
            "## 四、指标变化",
            "",
        ])

        if diff.metric_changes:
            lines.append("| 特征 | 均值变化 | 标准差变化 | 异常值变化 |")
            lines.append("|------|----------|------------|------------|")
            for feature, changes in diff.metric_changes.items():
                mean_delta = f"{changes.get('mean_delta', 0):+.4f}"
                std_delta = f"{changes.get('std_delta', 0):+.4f}"
                outlier_delta = f"{changes.get('outlier_delta', 0):+d}"
                lines.append(
                    f"| {feature} | {mean_delta} | {std_delta} | {outlier_delta} |"
                )
        else:
            lines.append("无指标变化")

        lines.extend([
            "",
            "## 五、状态变化",
            "",
        ])

        if diff.status_changes:
            lines.append("| 指标 | 旧值 | 新值 | 变化 |")
            lines.append("|------|------|------|------|")
            for field, change in diff.status_changes.items():
                lines.append(
                    f"| {field} | {change['old']} | {change['new']} | {change['delta']:+d} |"
                )
        else:
            lines.append("无状态变化")

        lines.extend([
            "",
            "## 六、灰度变化",
            "",
        ])

        if diff.gray_changes:
            if "gray_ratio_config" in diff.gray_changes:
                grc = diff.gray_changes["gray_ratio_config"]
                lines.append(f"灰度配置比例变化: {grc['old']} → {grc['new']}")
                lines.append("")
            if "gray_ratio_actual" in diff.gray_changes:
                gra = diff.gray_changes["gray_ratio_actual"]
                lines.append(
                    f"实际灰度比例变化: {gra['old']:.2%} → {gra['new']:.2%} "
                    f"({gra['delta']:+.2%})"
                )
                lines.append("")
            if "gray_samples" in diff.gray_changes:
                gs = diff.gray_changes["gray_samples"]
                lines.append(
                    f"灰度样本变化: 新增 {gs['count_added']} 个, "
                    f"移除 {gs['count_removed']} 个"
                )
                if gs["added"]:
                    lines.append(f"  新增: {', '.join(gs['added'][:10])}")
                    if len(gs["added"]) > 10:
                        lines.append(f"  等 {len(gs['added'])} 个")
                if gs["removed"]:
                    lines.append(f"  移除: {', '.join(gs['removed'][:10])}")
                    if len(gs["removed"]) > 10:
                        lines.append(f"  等 {len(gs['removed'])} 个")
        else:
            lines.append("无灰度变化")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filepath

    def load_snapshot(self, filepath: str) -> Snapshot:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        from .models import (
            Snapshot as SnapshotModel,
            SnapshotVersion as SnapshotVersionModel,
            SnapshotMetrics as SnapshotMetricsModel,
            ProcessingStats as ProcessingStatsModel,
            FeatureRow as FeatureRowModel,
            SnapshotThreshold as SnapshotThresholdModel,
        )

        version_data = data["version"]
        thresholds = {}
        for k, v in version_data.get("thresholds", {}).items():
            thresholds[k] = SnapshotThresholdModel(**v)

        version = SnapshotVersionModel(
            version_id=version_data["version_id"],
            name=version_data.get("name", ""),
            description=version_data.get("description", ""),
            parent_version=version_data.get("parent_version"),
            thresholds=thresholds,
            gray_ratio=version_data.get("gray_ratio", 0.0),
            gray_ratio_config=version_data.get("gray_ratio_config"),
            note=version_data.get("note", ""),
        )

        rows = [FeatureRowModel.from_dict(r) for r in data["rows"]]

        stats_data = data["stats"]
        stats = ProcessingStatsModel(
            total=stats_data["total"],
            processed=stats_data["processed"],
            bad=stats_data["bad"],
            skipped=stats_data["skipped"],
            boundary=stats_data["boundary"],
            gray_candidate=stats_data["gray_candidate"],
            gray_enabled=stats_data["gray_enabled"],
            gray_error=stats_data["gray_error"],
            manual_corrections=stats_data["manual_corrections"],
            auto_fixes=stats_data["auto_fixes"],
            threshold_adjustments=stats_data["threshold_adjustments"],
        )

        metrics = SnapshotMetricsModel(**data["metrics"])

        snapshot = SnapshotModel(
            snapshot_id=data["snapshot_id"],
            version=version,
            rows=rows,
            stats=stats,
            metrics=metrics,
            source_file=data.get("source_file", ""),
        )

        return snapshot
