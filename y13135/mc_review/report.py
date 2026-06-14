"""Markdown 报告生成器。

分区：已处理 / 待补材料 / 人工改判
含：跳变溯源、排序稳定性、历史备注时间线
"""

from __future__ import annotations

from pathlib import Path

from .models import ReviewBundle, QuestionItem, ReviewStatus, ChangeType, HistoryEntry


STATUS_CN = {
    ReviewStatus.PROCESSED: "已处理",
    ReviewStatus.PENDING: "待补材料",
    ReviewStatus.MANUAL: "人工改判",
}

CHANGE_TYPE_CN = {
    ChangeType.THRESHOLD: "阈值",
    ChangeType.UNIT: "单位",
    ChangeType.NOTE: "后补备注",
    ChangeType.SCORE: "分数",
    ChangeType.STATUS: "状态",
}


def _h(text: str, level: int = 2) -> str:
    return "#" * level + " " + text


def _table_row(cells: list[str]) -> str:
    return "| " + " | ".join(cells) + " |"


def _history_timeline(entries: list[HistoryEntry]) -> str:
    if not entries:
        return "_无历史备注_"
    lines = ["| 时间 | 字段 | 作者 | 内容 | 说明 |",
             "|---|---|---|---|---|"]
    for h in sorted(entries, key=lambda e: e.timestamp):
        lines.append(_table_row([
            h.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            h.field,
            h.author,
            (h.new_value or "").replace("|", "\\|"),
            h.note,
        ]))
    return "\n".join(lines)


def _question_card(q: QuestionItem, bundle: ReviewBundle) -> str:
    sort_trace = next((s for s in bundle.sort_traces if s.qid == q.qid), None)
    change_events = [ev for ev in bundle.change_events if ev.qid == q.qid]

    parts: list[str] = []
    parts.append(_h(f"[{q.qid}] {q.title}", 4))
    parts.append("")

    meta = [
        f"- **状态**: {STATUS_CN[q.status]}",
        f"- **得分**: {q.score} / {q.max_score}  ({q.score_ratio * 100:.1f}%)",
        f"- **阈值**: {q.threshold or '_未设置_'}",
        f"- **单位**: {q.unit or '_无_'}",
        f"- **原始行号**: {q.original_row}  |  **当前索引**: {q.current_index}",
    ]
    if sort_trace:
        if sort_trace.history_row >= 0:
            stability = "✅ 顺序稳定" if sort_trace.stable else (
                f"⚠️ 排序跳变（历史行 {sort_trace.history_row} → 当前行 {sort_trace.original_row}，"
                f"来源 `{sort_trace.history_source}`）"
            )
        else:
            stability = "ℹ️ 无历史版本对照"
        meta.append(f"- **排序**: {stability}  内容哈希 `{sort_trace.content_hash}`")
    parts.extend(meta)
    parts.append("")

    if q.screenshots:
        parts.append("- **截图**（留档，不做内联）: " + ", ".join(f"`{s}`" for s in q.screenshots))
        parts.append("")

    if q.manual_review_note:
        parts.append(f"> 📝 人工改判备注: {q.manual_review_note}")
        parts.append("")

    if change_events:
        parts.append(_h("跳变溯源", 5))
        parts.append("")
        parts.append("| 类型 | 字段 | 变更前 | 变更后 | 证据 | 严重度 |")
        parts.append("|---|---|---|---|---|---|")
        for ev in change_events:
            parts.append(_table_row([
                CHANGE_TYPE_CN.get(ev.change_type, ev.change_type.value),
                ev.field_name,
                (ev.before or "_空_").replace("|", "\\|"),
                (ev.after or "_空_").replace("|", "\\|"),
                ev.evidence.replace("|", "\\|"),
                ev.severity,
            ]))
        parts.append("")

    parts.append(_h("历史时间线（含补备注与旧版本截图）", 5))
    parts.append("")
    parts.append(_history_timeline(q.history))
    parts.append("")

    return "\n".join(parts)


def _section(status: ReviewStatus, questions: list[QuestionItem], bundle: ReviewBundle) -> str:
    label = STATUS_CN[status]
    parts = [_h(f"{label}（{len(questions)} 题）", 2), ""]
    if not questions:
        parts.append("_暂无_")
        parts.append("")
        return "\n".join(parts)

    parts.append("| 题号 | 题目 | 得分 | 原始行 | 当前索引 | 排序 |")
    parts.append("|---|---|---|---|---|---|")
    for q in questions:
        trace = next((s for s in bundle.sort_traces if s.qid == q.qid), None)
        stable_icon = "✅" if (trace and trace.stable) else "⚠️"
        parts.append(_table_row([
            q.qid,
            q.title.replace("|", "\\|"),
            f"{q.score}/{q.max_score}",
            str(q.original_row),
            str(q.current_index),
            stable_icon,
        ]))
    parts.append("")
    parts.append("---")
    parts.append("")
    for q in questions:
        parts.append(_question_card(q, bundle))
        parts.append("")
    return "\n".join(parts)


def render_report(bundle: ReviewBundle) -> str:
    parts: list[str] = []
    parts.append(_h("马尔可夫链错题复盘报告", 1))
    parts.append("")
    parts.append(f"- **来源文件**: `{bundle.source_file}`")
    parts.append(f"- **生成时间**: {bundle.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    parts.append(f"- **题目总数**: {len(bundle.questions)}")
    parts.append(f"- **已处理**: {len(bundle.processed)} | **待补材料**: {len(bundle.pending)} | **人工改判**: {len(bundle.manual)}")
    parts.append(f"- **排序不稳定**: {len(bundle.unstable_sorts)} 题")
    parts.append(f"- **跳变事件**: {len(bundle.change_events)} 条")
    parts.append("")
    parts.append("---")
    parts.append("")

    parts.append(_h("复核使用指引", 2))
    parts.append("")
    parts.append("1. 先看下方 **总览与跳变溯源**，锁定异常题目。")
    parts.append("2. 按分区阅读：已处理 ✅ → 待补材料 ⏳ → 人工改判 ✋。")
    parts.append("3. 每道题的 **历史时间线** 保留了后补备注和旧版本，不只看最终值。")
    parts.append("4. 排序不稳定的题目已标注原始行号，可回到输入 CSV 定位。")
    parts.append("")

    parts.append(_h("总览与跳变溯源", 2))
    parts.append("")
    if bundle.change_events:
        parts.append("| 题号 | 类型 | 字段 | 变更前 | 变更后 | 证据 |")
        parts.append("|---|---|---|---|---|---|")
        for ev in bundle.change_events:
            parts.append(_table_row([
                ev.qid,
                CHANGE_TYPE_CN.get(ev.change_type, ev.change_type.value),
                ev.field_name,
                (ev.before or "_空_").replace("|", "\\|"),
                (ev.after or "_空_").replace("|", "\\|"),
                ev.evidence.replace("|", "\\|"),
            ]))
    else:
        parts.append("_未检测到跳变事件_")
    parts.append("")

    if bundle.unstable_sorts:
        parts.append(_h("排序不稳定明细（追溯历史版本原始行号）", 3))
        parts.append("")
        parts.append("| 题号 | 历史行号 | 当前行号 | 历史来源 | 内容哈希 |")
        parts.append("|---|---|---|---|---|")
        for s in sorted(bundle.unstable_sorts, key=lambda x: x.original_row):
            parts.append(_table_row([s.qid, str(s.history_row), str(s.original_row), s.history_source, s.content_hash]))
        parts.append("")

    parts.append(_section(ReviewStatus.PROCESSED, bundle.processed, bundle))
    parts.append(_section(ReviewStatus.PENDING, bundle.pending, bundle))
    parts.append(_section(ReviewStatus.MANUAL, bundle.manual, bundle))

    parts.append(_h("附录：完整题目 JSON 字段", 2))
    parts.append("")
    parts.append("```json")
    import json
    parts.append(json.dumps([q.to_dict() for q in bundle.questions], ensure_ascii=False, indent=2))
    parts.append("```")
    parts.append("")

    return "\n".join(parts)


def write_report(bundle: ReviewBundle, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "review_report.md"
    report_path.write_text(render_report(bundle), encoding="utf-8")
    return report_path
