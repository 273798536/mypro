from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from topo_error_tracker.models import (
    AuditEntry,
    Edit,
    ExportSnapshot,
    Material,
    ReviewDecision,
    TrackingResult,
)
from topo_error_tracker.store import Store


class ReportGenerator:
    def __init__(self, store: Store):
        self.store = store

    def generate(self, material_id: str) -> str:
        material = self.store.get_material(material_id)
        if material is None:
            raise ValueError(f"材料 {material_id} 不存在")

        tracking = self.store.get_tracking_result(material_id)
        edits = self.store.list_edits(material_id)
        drafts = self.store.list_draft_images(material_id)
        audit_entries = self.store.list_audit_entries(material_id)
        latest_review = self.store.get_latest_review(material_id)
        latest_export = self.store.get_latest_export(material_id)
        raw = self.store.read_raw_draft(material_id)

        sections: List[str] = []
        sections.append(self._header(material))
        sections.append(self._raw_material_section(material, raw))
        sections.append(self._tracking_section(tracking))
        sections.append(self._error_detail_section(tracking))
        sections.append(self._anomalous_samples_section(tracking))
        sections.append(self._edits_section(edits))
        sections.append(self._drafts_section(drafts))
        sections.append(self._review_section(latest_review))
        sections.append(self._audit_section(audit_entries))
        sections.append(self._export_section(latest_export))
        sections.append(self._footer(material))

        return "\n\n".join(s for s in sections if s)

    def _header(self, m: Material) -> str:
        return (
            f"# 拓扑路径错因追踪报告\n\n"
            f"| 字段 | 值 |\n"
            f"|------|----|\n"
            f"| 材料ID | {m.id} |\n"
            f"| 批次 | {m.batch_id} |\n"
            f"| 导入时间 | {m.import_time.strftime('%Y-%m-%d %H:%M:%S')} |\n"
            f"| 来源标签 | {m.source_label or '（无）'} |\n"
            f"| 状态 | {m.status.value} |\n"
            f"| 生成时间 | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} |"
        )

    def _raw_material_section(self, m: Material, raw: Optional[Dict[str, Any]]) -> str:
        lines = ["## 原始材料（保留原始说法）\n"]
        lines.append(f"> {m.original_text}\n")
        if raw:
            lines.append("**原始导入数据：**\n")
            lines.append("```json")
            import json
            lines.append(json.dumps(raw, ensure_ascii=False, indent=2))
            lines.append("```")
        return "\n".join(lines)

    def _tracking_section(self, t: Optional[TrackingResult]) -> str:
        if t is None:
            return "## 追踪结果\n\n尚未执行拓扑路径错因追踪。"
        lines = ["## 追踪结果\n"]
        lines.append(t.explanation)
        lines.append(f"\n追踪时间：{t.tracked_at.strftime('%Y-%m-%d %H:%M:%S')}")
        return "\n".join(lines)

    def _error_detail_section(self, t: Optional[TrackingResult]) -> str:
        if t is None or not t.error_nodes:
            return ""
        lines = ["## 错因明细（公式 · 单位换算 · 反例）\n"]
        for i, node in enumerate(t.error_nodes, 1):
            lines.append(f"### {i}. [{node.step_label}] 节点 `{node.node_id}`\n")
            lines.append(f"- **严重度**：{node.severity.value}")
            if node.formula:
                lines.append(f"- **关键公式**：{node.formula}")
            if node.unit_conversion:
                lines.append(f"- **单位换算**：{node.unit_conversion}")
            lines.append(f"- **期望值**：{node.expected_value}")
            lines.append(f"- **实际值**：{node.actual_value}")
            lines.append(f"- **错因解释**：{node.explanation}")
            if node.counter_example:
                lines.append(f"- **反例**：{node.counter_example}")
            lines.append("")
        return "\n".join(lines)

    def _anomalous_samples_section(self, t: Optional[TrackingResult]) -> str:
        if t is None or not t.anomalous_samples:
            return ""
        lines = ["## 异常样本\n"]
        for i, sample in enumerate(t.anomalous_samples, 1):
            lines.append(f"{i}. {sample}")
        return "\n".join(lines)

    def _edits_section(self, edits: List[Edit]) -> str:
        if not edits:
            return ""
        lines = ["## 人工改动记录\n"]
        lines.append("| 字段 | 旧值 | 新值 | 编辑人 | 时间 | 原因 |")
        lines.append("|------|------|------|--------|------|------|")
        for e in edits:
            lines.append(
                f"| {e.field} | {e.old_value} | {e.new_value} "
                f"| {e.editor} | {e.edit_time.strftime('%Y-%m-%d %H:%M')} | {e.reason} |"
            )
        return "\n".join(lines)

    def _drafts_section(self, drafts: list) -> str:
        if not drafts:
            return ""
        lines = ["## 草稿图像\n"]
        for d in drafts:
            match_label = "✓ 图上顺" if d.graph_visual_match else "✗ 图上顺但明细不匹配"
            lines.append(f"- **{d.image_path}**：{match_label}")
            if d.detail_mismatch_description:
                lines.append(f"  - 不匹配说明：{d.detail_mismatch_description}")
            lines.append(f"  - 记录时间：{d.noted_at.strftime('%Y-%m-%d %H:%M')}")
        return "\n".join(lines)

    def _review_section(self, r: Optional[ReviewDecision]) -> str:
        if r is None:
            return ""
        lines = ["## 复核记录\n"]
        status = "✅ 通过" if r.approved else "❌ 未通过"
        lines.append(f"- **复核人**：{r.reviewer}")
        lines.append(f"- **结果**：{status}")
        lines.append(f"- **原因**：{r.reason}")
        lines.append(f"- **时间**：{r.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        if r.previous_reviewer:
            lines.append(f"- **上一次处理人**：{r.previous_reviewer}")
        if r.previous_reason:
            lines.append(f"- **上一次未通过原因**：{r.previous_reason}")
        if r.extrapolation_boundary:
            lines.append("- **⚠️ 涉及外推越界**")
        return "\n".join(lines)

    def _audit_section(self, entries: List[AuditEntry]) -> str:
        if not entries:
            return ""
        lines = ["## 审计轨迹\n"]
        lines.append("| 复核人 | 动作 | 原因 | 时间 | 触发规则 |")
        lines.append("|--------|------|------|------|----------|")
        for a in entries:
            rule = a.rule_violation or "（无）"
            lines.append(
                f"| {a.reviewer} | {a.action} | {a.reason} "
                f"| {a.timestamp.strftime('%Y-%m-%d %H:%M')} | {rule} |"
            )
        return "\n".join(lines)

    def _export_section(self, s: Optional[ExportSnapshot]) -> str:
        if s is None:
            return ""
        lines = ["## 导出同步状态\n"]
        sync_label = "✅ 同步" if s.synced else "❌ 未同步"
        lines.append(f"- **同步状态**：{sync_label}")
        lines.append(f"- **内容哈希**：{s.content_hash}")
        lines.append(f"- **标注数**：{s.annotation_count}")
        lines.append(f"- **编辑数**：{s.edit_count}")
        lines.append(f"- **导出时间**：{s.exported_at.strftime('%Y-%m-%d %H:%M:%S')}")
        if s.sync_details:
            lines.append(f"- **详情**：{s.sync_details}")
        return "\n".join(lines)

    def _footer(self, m: Material) -> str:
        return (
            "---\n\n"
            "*本报告由拓扑路径错因追踪工具生成，"
            "保留原始说法、人工改动与审计轨迹。*"
        )

    def write_report(self, material_id: str, output_path: Union[str, Path]) -> Path:
        content = self.generate(material_id)
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path
