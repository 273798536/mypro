from datetime import datetime
from typing import List, Dict, Any
from ..models.material import Material, MaterialStatus


class MarkdownGenerator:
    def __init__(self, title: str = "采样包素材清单归档报告"):
        self.title = title

    def generate(self, materials: List[Material]) -> str:
        processed = [m for m in materials if m.status == MaterialStatus.PROCESSED]
        pending = [m for m in materials if m.status == MaterialStatus.PENDING]
        manual = [m for m in materials if m.status == MaterialStatus.MANUAL_REVIEW]
        conflicts = [m for m in materials if m.status == MaterialStatus.CONFLICT]

        lines = []
        lines.append(f"# {self.title}")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("## 概览")
        lines.append("")
        lines.append("| 类别 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| 已处理 | {len(processed)} |")
        lines.append(f"| 待补材料 | {len(pending)} |")
        lines.append(f"| 人工改判 | {len(manual)} |")
        lines.append(f"| 版本冲突 | {len(conflicts)} |")
        lines.append(f"| **总计** | **{len(materials)}** |")
        lines.append("")

        lines.append("---")
        lines.append("")

        lines.append("## 一、已处理材料")
        lines.append("")
        if processed:
            lines.append(self._material_table(processed))
            lines.append("")
            for m in processed:
                lines.append(self._material_detail(m, show_annotations=bool(m.annotations)))
        else:
            lines.append("_暂无已处理材料_")
        lines.append("")

        lines.append("---")
        lines.append("")

        lines.append("## 二、待补材料")
        lines.append("")
        if pending:
            lines.append(self._material_table(pending))
            lines.append("")
            for m in pending:
                lines.append(self._material_detail(m, show_annotations=bool(m.annotations)))
        else:
            lines.append("_暂无待补材料_")
        lines.append("")

        lines.append("---")
        lines.append("")

        lines.append("## 三、人工改判")
        lines.append("")
        if manual:
            lines.append(self._material_table(manual))
            lines.append("")
            for m in manual:
                lines.append(self._material_detail(m, show_annotations=True))
        else:
            lines.append("_暂无人工改判记录_")
        lines.append("")

        if conflicts:
            lines.append("---")
            lines.append("")
            lines.append("## 四、版本冲突（需处理）")
            lines.append("")
            lines.append(self._material_table(conflicts))
            lines.append("")
            for m in conflicts:
                lines.append(self._material_detail(m, show_conflict=True, show_annotations=bool(m.annotations)))
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("_报告由采样包素材清单归档系统自动生成_")

        return "\n".join(lines)

    def _material_table(self, materials: List[Material]) -> str:
        lines = []
        lines.append("| 序号 | 材料名称 | 分类 | 版本 | 来源 | 提交人 | 提交时间 |")
        lines.append("|------|----------|------|------|------|--------|----------|")
        for i, m in enumerate(materials, 1):
            name = m.name
            if m.original_name and m.original_name != m.name:
                name = f"{m.name} <br><sub>原名: {m.original_name}</sub>"
            lines.append(
                f"| {i} | {name} | {m.category or '-'} | {m.version} | {m.source or '-'} | "
                f"{m.submitted_by or '-'} | {m.submitted_at or '-'} |"
            )
        return "\n".join(lines)

    def _material_detail(self, material: Material, show_annotations: bool = False, show_conflict: bool = False) -> str:
        lines = []
        lines.append(f"### {material.name}")
        lines.append("")
        lines.append(f"- **ID**: `{material.id}`")
        lines.append(f"- **状态**: {material.status.value}")
        if material.category:
            lines.append(f"- **分类**: {material.category}")
        lines.append(f"- **版本**: {material.version}")
        if material.version_source:
            lines.append(f"- **版本来源**: {material.version_source}")
        if material.source:
            lines.append(f"- **来源**: {material.source}")
        if material.source_raw:
            lines.append(f"- **原始来源痕迹**: {material.source_raw}")
        if material.submitted_by:
            lines.append(f"- **提交人**: {material.submitted_by}")
        if material.submitted_at:
            lines.append(f"- **提交时间**: {material.submitted_at}")
        if material.file_path:
            lines.append(f"- **文件路径**: `{material.file_path}`")
        if material.file_size:
            lines.append(f"- **文件大小**: {self._format_size(material.file_size)}")
        if material.duplicate_of:
            lines.append(f"- **合并自重复项**: `{material.duplicate_of}`")
            lines.append(f"- **去重置信度**: {material.confidence_score:.2%}")
        lines.append("")

        if material.notes:
            lines.append("**备注**:")
            lines.append("")
            lines.append(f"> {material.notes}")
            lines.append("")

        if show_conflict and "version_conflict" in material.raw_data:
            vc = material.raw_data["version_conflict"]
            lines.append("**版本冲突详情**:")
            lines.append("")
            lines.append(f"- 冲突类型: {vc.get('type', '-')}")
            lines.append(f"- 现有版本: {vc.get('existing_version', '-')} (来源: {vc.get('existing_version_source', '-')})")
            lines.append(f"- 提交版本: {vc.get('new_version', '-')} (来源: {vc.get('new_version_source', '-')})")
            lines.append(f"- 处理建议: {vc.get('recommendation', '-')}")
            lines.append("")

        if show_annotations and material.annotations:
            lines.append("**批注历史**:")
            lines.append("")
            for i, ann in enumerate(reversed(material.annotations), 1):
                lines.append(f"{i}. **{ann.get('timestamp', '')}** - {ann.get('reviewer', '未知')}")
                if ann.get("previous_status") and ann.get("new_status") and ann["previous_status"] != ann["new_status"]:
                    lines.append(f"   - 状态变更: {ann['previous_status']} → {ann['new_status']}")
                if ann.get("affected_fields"):
                    lines.append(f"   - 影响字段: {', '.join(ann['affected_fields'])}")
                if ann.get("source_line"):
                    lines.append(f"   - 来源行: {ann['source_line']}")
                if ann.get("comment"):
                    lines.append(f"   - 批注: {ann['comment']}")
                lines.append("")

        return "\n".join(lines)

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    def save_report(self, materials: List[Material], output_path: str) -> str:
        content = self.generate(materials)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return output_path
