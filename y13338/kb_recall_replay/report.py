from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import (
    EvaluationResult,
    MisjudgmentRecord,
    RecordStatus,
)
from .store import Store
from .replay import ReplayEngine


_STATUS_LABELS = {
    RecordStatus.PENDING: "⏳ 待处理",
    RecordStatus.PROCESSED: "✅ 已处理",
    RecordStatus.NEEDS_EVIDENCE: "🔍 待补证据",
}

_RESULT_LABELS = {
    EvaluationResult.CONFIRMED: "确认误判",
    EvaluationResult.FALSE_POSITIVE: "误报",
    EvaluationResult.FALSE_NEGATIVE: "漏报",
    EvaluationResult.INCONCLUSIVE: "无法判定",
}


def _fmt_time(ts: str) -> str:
    try:
        dt = datetime.fromisoformat(ts)
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, OSError):
        return ts


def generate_report(store: Store) -> str:
    engine = ReplayEngine(store)
    records = store.list_all()
    lines: list[str] = []

    lines.append("# 知识库召回误判回放报告")
    lines.append("")
    lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    processed = [r for r in records if r.status == RecordStatus.PROCESSED]
    needs_evidence = [r for r in records if r.status == RecordStatus.NEEDS_EVIDENCE]
    pending = [r for r in records if r.status == RecordStatus.PENDING]

    lines.append("## 总览")
    lines.append("")
    lines.append(f"| 状态 | 数量 |")
    lines.append(f"| --- | --- |")
    lines.append(f"| ✅ 已处理 | {len(processed)} |")
    lines.append(f"| 🔍 待补证据 | {len(needs_evidence)} |")
    lines.append(f"| ⏳ 待处理 | {len(pending)} |")
    lines.append("")

    if needs_evidence:
        lines.append("## 待补证据清单")
        lines.append("")
        for rec in needs_evidence:
            lines.append(f"- **{rec.name}** (`{rec.id}`)")
            if rec.evidence_path:
                lines.append(f"  - 证据路径：`{rec.evidence_path}`")
            last_eval = rec.evaluations[-1] if rec.evaluations else None
            if last_eval:
                lines.append(f"  - 最近判定：{_RESULT_LABELS.get(last_eval.result, last_eval.result.value)}（{last_eval.evaluator}）")
            lines.append("")

    if processed:
        lines.append("## 已处理记录")
        lines.append("")
        for rec in processed:
            _render_record_detail(lines, rec, engine)

    if pending:
        lines.append("## 待处理记录")
        lines.append("")
        for rec in pending:
            _render_record_detail(lines, rec, engine)

    has_gray = any(r.gray_results for r in records)
    if has_gray:
        lines.append("## 灰度结果拆解")
        lines.append("")
        for rec in records:
            if not rec.gray_results:
                continue
            lines.append(f"### {rec.name} (`{rec.id}`)")
            lines.append("")
            for idx, gray in enumerate(rec.gray_results, 1):
                lines.append(f"#### 灰度 #{idx} — {_fmt_time(gray.timestamp)}")
                lines.append("")

                if gray.sample_changes:
                    lines.append("**样本变化：**")
                    lines.append("")
                    for change in gray.sample_changes:
                        desc = change.get("description", "")
                        before = change.get("before", "")
                        after = change.get("after", "")
                        lines.append(f"- {desc}")
                        if before or after:
                            lines.append(f"  - 变更前：`{before}` → 变更后：`{after}`")
                    lines.append("")

                if gray.threshold_changes:
                    lines.append("**阈值变化：**")
                    lines.append("")
                    for change in gray.threshold_changes:
                        desc = change.get("description", "")
                        before = change.get("before", "")
                        after = change.get("after", "")
                        lines.append(f"- {desc}")
                        if before or after:
                            lines.append(f"  - 变更前：`{before}` → 变更后：`{after}`")
                    lines.append("")

                if gray.human_corrections:
                    lines.append("**人工改判：**")
                    lines.append("")
                    for corr in gray.human_corrections:
                        desc = corr.get("description", "")
                        original = corr.get("original_result", "")
                        corrected = corr.get("corrected_result", "")
                        operator = corr.get("operator", "")
                        lines.append(f"- {desc}")
                        if original or corrected:
                            lines.append(f"  - 原判定：`{original}` → 改判为：`{corrected}`")
                        if operator:
                            lines.append(f"  - 操作人：{operator}")
                    lines.append("")

    lines.append("## 重复评测追踪")
    lines.append("")
    dup_found = False
    for rec in records:
        dup_evals = [e for e in rec.evaluations if e.is_duplicate]
        if not dup_evals:
            continue
        dup_found = True
        lines.append(f"### {rec.name} (`{rec.id}`)")
        lines.append("")
        for ev in dup_evals:
            lines.append(f"- 评测 `{ev.id}` 与 `{ev.duplicate_of}` 重复")
            lines.append(f"  - 影响范围：{ev.impact_scope or '未标注'}")
            lines.append(f"  - 来源行：{ev.source_line or '未标注'}")
            lines.append(f"  - 评测人：{ev.evaluator}")
            lines.append("")
    if not dup_found:
        lines.append("未发现重复评测。")
        lines.append("")

    lines.append("## 版本历史明细")
    lines.append("")
    for rec in records:
        if not rec.versions:
            continue
        lines.append(f"### {rec.name} (`{rec.id}`) — {_STATUS_LABELS.get(rec.status, rec.status.value)}")
        lines.append("")
        if rec.aliases:
            lines.append(f"别名：{', '.join(rec.aliases)}")
            lines.append("")
        if rec.evidence_path:
            lines.append(f"证据路径：`{rec.evidence_path}`")
            lines.append("")
        lines.append("| 版本 | 时间 | 备注 | 截图 |")
        lines.append("| --- | --- | --- | --- |")
        for i, v in enumerate(rec.versions, 1):
            notes_short = v.notes[:40] + "…" if len(v.notes) > 40 else v.notes
            screenshots_count = len(v.screenshots)
            lines.append(f"| v{i} | {_fmt_time(v.timestamp)} | {notes_short} | {screenshots_count} 张 |")
        lines.append("")

        chain = engine.get_evidence_chain(rec.id)
        if len(chain) > 1:
            lines.append("<details>")
            lines.append("<summary>完整证据链</summary>")
            lines.append("")
            for entry in chain:
                if entry["type"] == "version":
                    lines.append(f"- 📄 **版本变更** {_fmt_time(entry['timestamp'])}")
                    if entry["notes"]:
                        lines.append(f"  - 备注：{entry['notes']}")
                    if entry["screenshots"]:
                        lines.append(f"  - 截图：{', '.join(entry['screenshots'])}")
                    if entry["values"]:
                        for k, val in entry["values"].items():
                            lines.append(f"  - {k}：`{val}`")
                elif entry["type"] == "evaluation":
                    dup_tag = " ⚠️重复" if entry["is_duplicate"] else ""
                    lines.append(f"- 🔎 **评测** {_fmt_time(entry['timestamp'])}{dup_tag}")
                    lines.append(f"  - 结果：{_RESULT_LABELS.get(EvaluationResult(entry['result']), entry['result'])}")
                    if entry["score"] is not None:
                        lines.append(f"  - 分数：{entry['score']}")
                    if entry["evidence_ref"]:
                        lines.append(f"  - 证据引用：`{entry['evidence_ref']}`")
                    if entry["impact_scope"]:
                        lines.append(f"  - 影响范围：{entry['impact_scope']}")
                    if entry["source_line"]:
                        lines.append(f"  - 来源行：{entry['source_line']}")
                    if entry["is_duplicate"] and entry["duplicate_of"]:
                        lines.append(f"  - 重复自：`{entry['duplicate_of']}`")
                elif entry["type"] == "gray_result":
                    lines.append(f"- 🧪 **灰度结果** {_fmt_time(entry['timestamp'])}")
                    if entry["sample_changes"]:
                        lines.append(f"  - 样本变化：{len(entry['sample_changes'])} 项")
                    if entry["threshold_changes"]:
                        lines.append(f"  - 阈值变化：{len(entry['threshold_changes'])} 项")
                    if entry["human_corrections"]:
                        lines.append(f"  - 人工改判：{len(entry['human_corrections'])} 项")
                lines.append("")
            lines.append("</details>")
            lines.append("")

    return "\n".join(lines)


def _render_record_detail(lines: list[str], rec: MisjudgmentRecord, engine: ReplayEngine) -> None:
    lines.append(f"### {rec.name} (`{rec.id}`)")
    lines.append("")
    lines.append(f"- 状态：{_STATUS_LABELS.get(rec.status, rec.status.value)}")
    if rec.evidence_path:
        lines.append(f"- 证据路径：`{rec.evidence_path}`")
    if rec.aliases:
        lines.append(f"- 别名：{', '.join(rec.aliases)}")
    if rec.evaluations:
        last_eval = rec.evaluations[-1]
        lines.append(f"- 最近评测：{_RESULT_LABELS.get(last_eval.result, last_eval.result.value)}（{last_eval.evaluator}，{_fmt_time(last_eval.timestamp)}）")
        if last_eval.score is not None:
            lines.append(f"- 分数：{last_eval.score}")
        if last_eval.evidence_ref:
            lines.append(f"- 证据引用：`{last_eval.evidence_ref}`")
    lines.append("")
