import os
import json
from .models import CompareResult


def generate_terminal_summary(result: CompareResult) -> str:
    s = result.summary
    lines = []
    lines.append("=" * 60)
    lines.append("  排班推荐灰度对比 - 终端摘要")
    lines.append("=" * 60)
    lines.append(f"  生成时间: {result.generated_at}")
    lines.append("-" * 60)
    lines.append(f"  总样本数:     {s.total_samples}")
    lines.append(f"  新旧都有:     {s.both}")
    lines.append(f"  仅旧模型:     {s.old_only}")
    lines.append(f"  仅新模型:     {s.new_only}")
    lines.append("-" * 60)
    lines.append(f"  结论一致:     {s.conclusion_same}")
    lines.append(f"  结论变化:     {s.conclusion_changed}")
    if s.change_types:
        lines.append("    变化类型分布:")
        for ct, cnt in sorted(s.change_types.items(), key=lambda x: -x[1]):
            lines.append(f"      - {ct}: {cnt}")
    lines.append("-" * 60)
    lines.append(f"  标签冲突数:   {s.tag_conflict_count}")
    lines.append(f"  晚到附件数:   {s.late_attachment_count}")
    lines.append(f"  历史记录数:   {len(result.history)}")
    lines.append("-" * 60)

    changed_items = [it for it in result.items if it.conclusion_changed]
    if changed_items:
        lines.append("  结论变化样本 (前10条):")
        for it in changed_items[:10]:
            old_c = it.old_result.conclusion if it.old_result else "无"
            new_c = it.new_result.conclusion if it.new_result else "无"
            lines.append(f"    [{it.sample_id}] {old_c} → {new_c}  ({it.change_type})")
        if len(changed_items) > 10:
            lines.append(f"    ... 还有 {len(changed_items) - 10} 条，详见报告")

    lines.append("=" * 60)
    lines.append("  完整报告请查看输出目录下的 screenshot_report.md")
    lines.append("=" * 60)
    return "\n".join(lines)


def generate_screenshot_report(result: CompareResult) -> str:
    lines = []
    lines.append("# 排班推荐灰度对比报告")
    lines.append("")
    lines.append(f"> 生成时间: {result.generated_at}")
    lines.append("")

    s = result.summary
    lines.append("## 一、总览统计")
    lines.append("")
    lines.append("| 指标 | 数量 |")
    lines.append("|------|------|")
    lines.append(f"| 总样本数 | {s.total_samples} |")
    lines.append(f"| 新旧都有 | {s.both} |")
    lines.append(f"| 仅旧模型 | {s.old_only} |")
    lines.append(f"| 仅新模型 | {s.new_only} |")
    lines.append(f"| 结论一致 | {s.conclusion_same} |")
    lines.append(f"| 结论变化 | {s.conclusion_changed} |")
    lines.append(f"| 标签冲突 | {s.tag_conflict_count} |")
    lines.append(f"| 晚到附件 | {s.late_attachment_count} |")
    lines.append(f"| 历史记录 | {len(result.history)} |")
    lines.append("")

    if s.change_types:
        lines.append("### 变化类型分布")
        lines.append("")
        for ct, cnt in sorted(s.change_types.items(), key=lambda x: -x[1]):
            lines.append(f"- **{ct}**: {cnt}")
        lines.append("")

    changed_items = [it for it in result.items if it.conclusion_changed]
    if changed_items:
        lines.append("## 二、结论变化明细")
        lines.append("")
        for i, it in enumerate(changed_items, 1):
            lines.append(f"### {i}. 样本 `{it.sample_id}`")
            lines.append("")
            lines.append(f"- **变化类型**: {it.change_type}")
            lines.append("")

            lines.append("#### 旧模型结论")
            if it.old_result:
                lines.append(f"- 结论: **{it.old_result.conclusion}**")
                lines.append(f"- 置信度: {it.old_result.confidence}")
                lines.append(f"- 理由: {it.old_result.reason}")
                if it.old_result.tags:
                    lines.append(f"- 标签: {', '.join(it.old_result.tags)}")
            else:
                lines.append("- 无旧模型结果")
            lines.append("")

            lines.append("#### 新模型结论")
            if it.new_result:
                lines.append(f"- 结论: **{it.new_result.conclusion}**")
                lines.append(f"- 置信度: {it.new_result.confidence}")
                lines.append(f"- 理由: {it.new_result.reason}")
                if it.new_result.tags:
                    lines.append(f"- 标签: {', '.join(it.new_result.tags)}")
            else:
                lines.append("- 无新模型结果")
            lines.append("")

            if it.sample:
                lines.append("#### 样本表原始说法")
                lines.append(f"- 来源表: {it.sample.source_table} 第 {it.sample.row_index} 行")
                lines.append(f"- 原始标签: {it.sample.original_label}")
                lines.append(f"- 原始文本: {it.sample.original_text}")
                lines.append("")

            if it.late_attachments:
                lines.append("#### 晚到附件 → 结论链路")
                for att in it.late_attachments:
                    lines.append(f"- **附件 `{att.attachment_id}`**")
                    lines.append(f"  - 到达时间: {att.arrived_at or '未知'}")
                    lines.append(f"  - 来源文件: {att.source_path}")
                    lines.append(f"  - 内容:")
                    for cline in att.content.split("\n"):
                        lines.append(f"    > {cline}")
                lines.append("")

            if it.tag_conflicts:
                lines.append("#### ⚠️ 标签冲突（可追溯样本表）")
                for tc in it.tag_conflicts:
                    lines.append(f"- 样本表标签 `{tc.sample_table_label}` vs 模型标签 `{tc.model_tag}`")
                    lines.append(f"  - 来源: {tc.source_table} 第 {tc.row_index} 行")
                    lines.append(f"  - 原始说法: {tc.sample_original_text}")
                lines.append("")

            if it.manual_notes:
                lines.append("#### 📝 历史人工修改记录")
                for note in it.manual_notes:
                    lines.append(f"- {note}")
                lines.append("")

            lines.append("---")
            lines.append("")

    conflict_items = [it for it in result.items if it.tag_conflicts]
    if conflict_items:
        lines.append("## 三、标签冲突汇总")
        lines.append("")
        lines.append("| 样本ID | 样本表标签 | 模型标签 | 来源表 | 行号 | 原始说法 |")
        lines.append("|--------|-----------|---------|--------|------|---------|")
        for it in conflict_items:
            for tc in it.tag_conflicts:
                text_short = tc.sample_original_text[:30] + "..." if len(tc.sample_original_text) > 30 else tc.sample_original_text
                lines.append(f"| {tc.sample_id} | {tc.sample_table_label} | {tc.model_tag} | {tc.source_table} | {tc.row_index} | {text_short} |")
        lines.append("")

    if result.history:
        lines.append("## 四、全部历史记录")
        lines.append("")
        lines.append("| 时间 | 样本ID | 修改人 | 字段 | 原值 | 新值 | 原因 |")
        lines.append("|------|--------|--------|------|------|------|------|")
        for h in result.history:
            lines.append(f"| {h.timestamp} | {h.sample_id} | {h.operator} | {h.field} | {h.old_value} | {h.new_value} | {h.reason} |")
        lines.append("")

    return "\n".join(lines)


def save_outputs(result: CompareResult, output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)

    summary_path = os.path.join(output_dir, "terminal_summary.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(generate_terminal_summary(result))

    report_path = os.path.join(output_dir, "screenshot_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(generate_screenshot_report(result))

    detail_path = os.path.join(output_dir, "detail.json")
    with open(detail_path, "w", encoding="utf-8") as f:
        json.dump(_result_to_dict(result), f, ensure_ascii=False, indent=2)


def _result_to_dict(result: CompareResult) -> dict:
    return {
        "generated_at": result.generated_at,
        "summary": {
            "total_samples": result.summary.total_samples,
            "old_only": result.summary.old_only,
            "new_only": result.summary.new_only,
            "both": result.summary.both,
            "conclusion_changed": result.summary.conclusion_changed,
            "conclusion_same": result.summary.conclusion_same,
            "tag_conflict_count": result.summary.tag_conflict_count,
            "late_attachment_count": result.summary.late_attachment_count,
            "change_types": result.summary.change_types,
        },
        "items": [
            {
                "sample_id": it.sample_id,
                "change_type": it.change_type,
                "conclusion_changed": it.conclusion_changed,
                "old_result": {
                    "conclusion": it.old_result.conclusion,
                    "confidence": it.old_result.confidence,
                    "reason": it.old_result.reason,
                    "tags": it.old_result.tags,
                    "model_version": it.old_result.model_version,
                } if it.old_result else None,
                "new_result": {
                    "conclusion": it.new_result.conclusion,
                    "confidence": it.new_result.confidence,
                    "reason": it.new_result.reason,
                    "tags": it.new_result.tags,
                    "model_version": it.new_result.model_version,
                } if it.new_result else None,
                "sample": {
                    "original_label": it.sample.original_label,
                    "original_text": it.sample.original_text,
                    "source_table": it.sample.source_table,
                    "row_index": it.sample.row_index,
                } if it.sample else None,
                "late_attachments": [
                    {
                        "attachment_id": a.attachment_id,
                        "content": a.content,
                        "arrived_at": a.arrived_at,
                        "source_path": a.source_path,
                    }
                    for a in it.late_attachments
                ],
                "tag_conflicts": [
                    {
                        "sample_table_label": tc.sample_table_label,
                        "model_tag": tc.model_tag,
                        "sample_original_text": tc.sample_original_text,
                        "source_table": tc.source_table,
                        "row_index": tc.row_index,
                    }
                    for tc in it.tag_conflicts
                ],
                "manual_notes": it.manual_notes,
            }
            for it in result.items
        ],
        "history": [
            {
                "timestamp": h.timestamp,
                "sample_id": h.sample_id,
                "field": h.field,
                "old_value": h.old_value,
                "new_value": h.new_value,
                "operator": h.operator,
                "reason": h.reason,
            }
            for h in result.history
        ],
    }
