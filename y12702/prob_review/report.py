from typing import Optional
from .models import ProcessingRecord, ErrorRecord, TreeNode, ErrorSeverity


def render_tree_trace(node: TreeNode, target_id: str, depth: int = 0) -> Optional[str]:
    prefix = "  " * depth
    marker = " ◀─ 当前节点" if node.id == target_id else ""
    lines = [f"{prefix}├─ [{node.id}] {node.label}  P={node.probability:.4f}{marker}"]
    if node.calc_note and node.id == target_id:
        lines.append(f"{prefix}│   计算草稿: {node.calc_note}")
    if node.source_ref and node.id == target_id:
        lines.append(f"{prefix}│   来源引用: {node.source_ref}")
    for child in node.children:
        sub = render_tree_trace(child, target_id, depth + 1)
        if sub:
            lines.append(sub)
    if marker or any("◀─" in l for l in lines[1:]):
        return "\n".join(lines)
    return None


def generate_markdown_report(record: ProcessingRecord) -> str:
    lines: list[str] = []
    lines.append(f"# 概率树错因复盘报告")
    lines.append("")
    lines.append(f"- **处理记录 ID**: `{record.id}`")
    lines.append(f"- **批次 ID**: `{record.batch_id}`")
    lines.append(f"- **来源文件**: `{record.source_file}`")
    lines.append(f"- **源文件哈希**: `{record.source_hash[:16]}...`")
    lines.append(f"- **处理状态**: `{record.status.value}`")
    lines.append(f"- **创建时间**: {record.created_at}")
    lines.append(f"- **最近更新**: {record.updated_at}")
    lines.append("")

    lines.append("## 一、总体结论（可直接复制给同事）")
    lines.append("")
    lines.append(f"> {record.overall_summary_zh}")
    lines.append("")

    if not record.errors:
        lines.append("**本次校验未发现概率偏差，所有节点符合概率公理要求。**")
        return "\n".join(lines)

    lines.append("## 二、误差记录汇总")
    lines.append("")

    severity_order = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW]
    severity_label = {
        ErrorSeverity.CRITICAL: "🔴 严重",
        ErrorSeverity.HIGH: "🟠 较大",
        ErrorSeverity.MEDIUM: "🟡 中等",
        ErrorSeverity.LOW: "🟢 轻微",
    }

    for sev in severity_order:
        errs_of_sev = [e for e in record.errors if e.severity == sev]
        if not errs_of_sev:
            continue
        lines.append(f"### {severity_label[sev]}偏差（{len(errs_of_sev)} 条）")
        lines.append("")
        for i, e in enumerate(errs_of_sev, 1):
            lines.append(f"#### {i}. [{e.record_id}] {e.node_label} — {e.error_type}")
            lines.append("")
            lines.append(f"| 项目 | 数值 |")
            lines.append(f"|------|------|")
            lines.append(f"| 预期值 | {e.expected_prob:.6f} |")
            lines.append(f"| 实际值 | {e.actual_prob:.6f} |")
            lines.append(f"| 绝对误差 | {e.absolute_error:.6f} |")
            lines.append(f"| 相对误差 | {e.relative_error*100:.2f}% |")
            lines.append(f"| 关联节点 ID | `{e.node_id}` |")
            lines.append(f"| 计算草稿引用 | `{e.calc_draft_ref or '（未记录）'}` |")
            lines.append("")
            lines.append(f"**问题说明**：{e.explanation_zh}")
            lines.append("")
            lines.append(f"**处理建议**：{e.suggestion_zh}")
            lines.append("")
            if e.processing_note:
                lines.append(f"```")
                lines.append(f"处理过程记录: {e.processing_note}")
                lines.append(f"```")
                lines.append("")

    if record.tree_root:
        lines.append("## 三、从异常回溯到计算草稿")
        lines.append("")
        lines.append("以下为每条严重/较大偏差在概率树中的位置及其计算草稿引用：")
        lines.append("")
        focus = [e for e in record.errors if e.severity in (ErrorSeverity.CRITICAL, ErrorSeverity.HIGH)]
        if not focus:
            focus = record.errors[:3]
        for e in focus:
            lines.append(f"### 回溯「{e.node_label}」(误差ID: {e.record_id})")
            lines.append("")
            lines.append("```")
            trace = render_tree_trace(record.tree_root, e.node_id)
            if trace:
                lines.append(trace)
            else:
                lines.append(f"节点 {e.node_id} 未在树中找到")
            lines.append("```")
            lines.append("")
            if e.calc_draft_ref:
                lines.append(f"- 计算草稿: `{e.calc_draft_ref}`")
            if e.processing_note:
                lines.append(f"- 处理意见: {e.processing_note}")
            lines.append("")

    if record.review_notes:
        lines.append("## 四、复核记录")
        lines.append("")
        for i, note in enumerate(record.review_notes, 1):
            lines.append(f"### 复核 #{i}  @ {note.get('timestamp', 'N/A')}")
            lines.append("")
            lines.append(f"- 复核人: {note.get('reviewer', '未署名')}")
            lines.append(f"- 关联误差ID: `{note.get('error_id', '全部')}`")
            lines.append(f"- 复核意见: {note.get('comment', '')}")
            lines.append(f"- 修正后概率: {note.get('corrected_value', '未修改')}")
            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"*报告由 prob-review CLI 工具自动生成，记录 ID: `{record.id}`*")
    lines.append("")
    return "\n".join(lines)
