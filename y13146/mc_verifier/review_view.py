from typing import Dict, List, Optional
from datetime import datetime

from .models import (
    ParameterVersion,
    ValidationResult,
    ValidationStatus,
)


class ReviewView:
    """
    复核视图：把参数版本、异常点、解释放在同一页，
    方便复核人一眼看全关键信息，不用翻页找。
    """

    def __init__(self):
        pass

    def render_one_page(
        self,
        param_version: ParameterVersion,
        validation_result: ValidationResult,
        version_manager=None,
    ) -> str:
        lines = []

        lines.append("=" * 78)
        lines.append("  蒙特卡洛误差边界校验 - 复核视图（单页版）")
        lines.append("=" * 78)
        lines.append("")

        lines.append("┌─ 参数版本信息 ───────────────────────────────────────────────────────┐")
        lines.append(f"│ 版本号    : v{param_version.version:<60} │")
        lines.append(f"│ 记录数    : {param_version.record_count():<63} │")
        lines.append(f"│ 创建时间  : {param_version.created_at.strftime('%Y-%m-%d %H:%M:%S'):<59} │")
        lines.append(f"│ 来源说明  : {self._truncate(param_version.supplement_note, 60):<60} │")
        if param_version.is_supplement:
            lines.append(f"│ 基于版本  : v{param_version.base_version} (补充材料){' ' * 42} │")
        lines.append("└─────────────────────────────────────────────────────────────────────┘")
        lines.append("")

        lines.append("┌─ 校验结果摘要 ───────────────────────────────────────────────────────┐")
        status_icon = self._status_icon(validation_result.status)
        lines.append(f"│ 校验状态  : {status_icon} {validation_result.status.value:<55} │")
        lines.append(f"│ 总记录数  : {validation_result.total_records:<63} │")
        lines.append(f"│ 异常点数  : {validation_result.anomaly_count:<63} │")
        lines.append(f"│ 外推越界  : {len(validation_result.extrapolation_issues):<63} │")
        lines.append(f"│ 模拟次数  : {validation_result.simulation_count:,}<62 │")
        lines.append(f"│ 置信度    : {validation_result.confidence_level*100:.0f}%{' ' * 58} │")
        lines.append("└─────────────────────────────────────────────────────────────────────┘")
        lines.append("")

        if validation_result.anomalies:
            lines.append("┌─ 异常点明细（含解释） ───────────────────────────────────────────────┐")

            grouped = self._group_by_record(validation_result.anomalies)
            for idx, (record_id, anomalies) in enumerate(grouped.items(), 1):
                record = param_version.records.get(record_id)
                lines.append(f"│  [{idx}] 记录 ID: {record_id:<52} │")
                if record:
                    lines.append(f"│       来源   : {self._truncate(record.source, 57):<57} │")
                    lines.append(f"│       明细链 : {self._truncate(record.detail_ref, 57):<57} │")

                for a in anomalies:
                    tag = " [外推]" if a.is_extrapolation else ""
                    lines.append(
                        f"│       • {a.param_name} = {a.actual_value:.4f} "
                        f"(μ={a.expected_value:.4f}, z={a.z_score:+.2f}σ){tag}"
                    )
                    lines.append(f"│         边界: [{a.boundary_lower:.4f}, {a.boundary_upper:.4f}]")
                    lines.append(f"│         解释: {self._wrap_text(a.explanation, 62)}")

                lines.append("│")

            lines.append("└─────────────────────────────────────────────────────────────────────┘")
            lines.append("")

        if validation_result.extrapolation_issues:
            lines.append("┌─ 外推越界卡点（需人工确认） ─────────────────────────────────────────┐")
            for idx, issue in enumerate(validation_result.extrapolation_issues, 1):
                dir_text = "上沿 ↑" if issue.direction == "upper" else "下沿 ↓"
                lines.append(f"│  [{idx}] 记录 [{issue.record_id}] / 参数 [{issue.param_name}]")
                lines.append(f"       方向  : {dir_text}")
                lines.append(f"       严重度: {issue.severity.upper()}")
                lines.append(f"       原因  : {self._wrap_text(issue.reason, 62)}")
                lines.append(f"       下一步: {self._wrap_text(issue.next_step, 62)}")
                if issue.confirmed:
                    lines.append(
                        f"       已确认: {issue.confirmed_by} @ "
                        f"{issue.confirmed_at.strftime('%Y-%m-%d %H:%M') if issue.confirmed_at else ''}"
                    )
                    lines.append(f"       备注  : {self._wrap_text(issue.confirm_note, 62)}")
                lines.append("│")
            lines.append("└─────────────────────────────────────────────────────────────────────┘")
            lines.append("")

        if validation_result.status == ValidationStatus.MANUAL_OVERRIDDEN:
            lines.append("┌─ 人工改判记录 ───────────────────────────────────────────────────────┐")
            lines.append(f"│ 原判断    : {validation_result.previous_judgment or '未知':<59} │")
            lines.append(
                f"│ 改判说明  : {self._truncate(validation_result.manual_review_note, 60):<60} │"
            )
            lines.append("└─────────────────────────────────────────────────────────────────────┘")
            lines.append("")

        if version_manager is not None and param_version.version > 1:
            prev_version = version_manager.get_version(param_version.version - 1)
            if prev_version:
                diff = version_manager.compare_versions(
                    prev_version.version, param_version.version
                )
                lines.append("┌─ 相对上一版本变化 ───────────────────────────────────────────────────┐")
                lines.append(f"│ 新增记录  : {diff['added_count']} 条 {' ' * 55} │")
                lines.append(f"│ 更新记录  : {diff['changed_count']} 条 {' ' * 55} │")
                lines.append(f"│ 删除记录  : {diff['removed_count']} 条 {' ' * 55} │")
                if diff["changed_ids"]:
                    lines.append(
                        f"│ 变动清单  : {', '.join(diff['changed_ids'][:5])}"
                        f"{'...' if len(diff['changed_ids']) > 5 else ''}{' ' * 20} │"
                    )
                lines.append("└─────────────────────────────────────────────────────────────────────┘")
                lines.append("")

        lines.append("─" * 78)
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("─" * 78)

        return "\n".join(lines)

    def _group_by_record(self, anomalies):
        grouped: Dict[str, List] = {}
        for a in anomalies:
            if a.record_id not in grouped:
                grouped[a.record_id] = []
            grouped[a.record_id].append(a)
        return grouped

    def _status_icon(self, status: ValidationStatus) -> str:
        icons = {
            ValidationStatus.PASSED: "✅",
            ValidationStatus.FAILED: "❌",
            ValidationStatus.PENDING: "⏳",
            ValidationStatus.MANUAL_OVERRIDDEN: "👤",
            ValidationStatus.NEEDS_MORE_DATA: "📥",
        }
        return icons.get(status, "?")

    def _truncate(self, text: str, max_len: int) -> str:
        if not text:
            return "(无)"
        if len(text) <= max_len:
            return text
        return text[: max_len - 3] + "..."

    def _wrap_text(self, text: str, width: int) -> str:
        if not text:
            return "(无)"
        if len(text) <= width:
            return text

        lines = []
        remaining = text
        while remaining:
            chunk = remaining[:width]
            lines.append(chunk)
            remaining = remaining[width:]

        join_str = "\n│           "
        return join_str.join(lines)
