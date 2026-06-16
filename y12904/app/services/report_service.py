import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import (
    QuestionBank, Question, CheckTask, CheckResult, TaskStatus,
    CheckType, SeverityLevel, AuditLog, ActionType,
)

SEVERITY_LABELS = {
    SeverityLevel.INFO: "ℹ️ 信息",
    SeverityLevel.WARNING: "⚠️ 警告",
    SeverityLevel.ERROR: "🔴 错误",
    SeverityLevel.BLOCKER: "🚫 阻断",
}

SEVERITY_HTML_COLORS = {
    SeverityLevel.INFO: "#17a2b8",
    SeverityLevel.WARNING: "#ffc107",
    SeverityLevel.ERROR: "#dc3545",
    SeverityLevel.BLOCKER: "#6c0a0a",
}

CHECK_TYPE_LABELS = {
    CheckType.LEAKAGE: "训练验证泄漏",
    CheckType.DISTRIBUTION: "切分分布",
    CheckType.DUPLICATE: "样本重复",
    CheckType.DIFFICULTY: "难度偏科",
    CheckType.CATEGORY: "类别偏科",
}


def generate_markdown_report(db: Session, task_id: int) -> str:
    task, bank, results = _load_report_data(db, task_id)
    lines = []

    lines.append(f"# 模型评测题库偏科检查报告")
    lines.append("")
    lines.append(f"**题库名称**: {bank.name}")
    lines.append(f"**检查任务**: {task.task_name}")
    lines.append(f"**任务状态**: {_status_label(task.status)}")
    lines.append(f"**生成时间**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    if task.reviewer:
        lines.append(f"**复核人**: {task.reviewer}")
    if task.review_comment:
        lines.append(f"**复核意见**: {task.review_comment}")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 概述（普通话说明）")
    lines.append("")
    summary_text = _generate_plain_summary(task, results)
    lines.append(summary_text)
    lines.append("")

    blocking = [r for r in results if r.is_blocking and not r.resolved]
    if blocking:
        lines.append("---")
        lines.append("")
        lines.append("## 🚫 阻断项（必须处理）")
        lines.append("")
        lines.append("以下问题必须在通过复核前解决：")
        lines.append("")
        for i, r in enumerate(blocking, 1):
            lines.append(f"### 阻断项 {i}: {CHECK_TYPE_LABELS.get(r.check_type, r.check_type.value)} — {SEVERITY_LABELS[r.severity]}")
            lines.append("")
            lines.append(f"**涉及题目**: {r.question_id or '全局'}")
            lines.append("")
            lines.append(f"**问题详情**: {r.detail}")
            lines.append("")
            lines.append(f"**通俗解释**: {r.plain_explanation}")
            lines.append("")
            lines.append(f"**下一步操作**: {r.action_hint}")
            lines.append("")
            if r.original_human_note:
                lines.append(f"**人工备注（原文）**: \"{r.original_human_note}\"")
                lines.append("")
            if r.metadata_json and "blocking_reason" in r.metadata_json:
                lines.append(f"**阻断原因**: {r.metadata_json['blocking_reason']}")
                lines.append("")
            if r.resolved:
                lines.append(f"**已解决**: {r.resolution}")
                lines.append("")
            lines.append("")

    leakage_results = [r for r in results if r.check_type == CheckType.LEAKAGE]
    if leakage_results:
        lines.append("---")
        lines.append("")
        lines.append("## 训练验证泄漏详情")
        lines.append("")
        lines.append("以下是训练集、验证集和测试集之间存在的数据泄漏记录。每条记录都附有通俗解释和处理建议，帮助判断下一步该补材料还是改口径。")
        lines.append("")
        for i, r in enumerate(leakage_results, 1):
            lines.append(f"### 泄漏记录 {i}")
            lines.append("")
            lines.append(f"| 字段 | 内容 |")
            lines.append(f"| --- | --- |")
            lines.append(f"| 严重级别 | {SEVERITY_LABELS[r.severity]} |")
            lines.append(f"| 涉及题目 | {r.question_id or '全局'} |")
            lines.append(f"| 问题详情 | {r.detail} |")
            lines.append(f"| 通俗解释 | {r.plain_explanation} |")
            lines.append(f"| 下一步操作 | {r.action_hint} |")
            if r.original_human_note:
                lines.append(f"| 人工备注（原文） | \"{r.original_human_note}\" |")
            if r.metadata_json and "blocking_reason" in r.metadata_json:
                lines.append(f"| 阻断原因 | {r.metadata_json['blocking_reason']} |")
            lines.append(f"| 是否阻断 | {'是' if r.is_blocking else '否'} |")
            lines.append(f"| 已解决 | {'是 — ' + r.resolution if r.resolved else '否'} |")
            lines.append("")

    other_results = [r for r in results if r.check_type != CheckType.LEAKAGE]
    if other_results:
        lines.append("---")
        lines.append("")
        lines.append("## 其他检查结果")
        lines.append("")
        by_type = {}
        for r in other_results:
            ct_label = CHECK_TYPE_LABELS.get(r.check_type, r.check_type.value)
            if ct_label not in by_type:
                by_type[ct_label] = []
            by_type[ct_label].append(r)

        for ct_label, ct_results in by_type.items():
            lines.append(f"### {ct_label}")
            lines.append("")
            for r in ct_results:
                lines.append(f"- **{SEVERITY_LABELS[r.severity]}** {r.detail}")
                lines.append(f"  - 通俗解释：{r.plain_explanation}")
                lines.append(f"  - 处理建议：{r.action_hint}")
                if r.original_human_note:
                    lines.append(f'  - 人工备注（原文）："{r.original_human_note}"')
            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 操作历史")
    lines.append("")
    logs = db.query(AuditLog).filter(
        (AuditLog.task_id == task_id) | (AuditLog.bank_id == task.bank_id)
    ).order_by(AuditLog.created_at).all()
    for log in logs:
        lines.append(f"- `{log.created_at.strftime('%Y-%m-%d %H:%M')}` [{log.action.value}] {log.actor}: {log.detail}")
    lines.append("")

    return "\n".join(lines)


def generate_html_report(db: Session, task_id: int) -> str:
    task, bank, results = _load_report_data(db, task_id)
    md = generate_markdown_report(db, task_id)

    html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>模型评测题库偏科检查报告</title>
<style>
body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.8; }
h1 { border-bottom: 2px solid #1a73e8; padding-bottom: 8px; color: #1a73e8; }
h2 { border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px; }
h3 { margin-top: 20px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; }
.blocker { background: #ffe0e0; border-left: 4px solid #dc3545; padding: 12px 16px; margin: 12px 0; }
.error { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 12px 0; }
.warning { background: #fff8e1; border-left: 4px solid #ff9800; padding: 12px 16px; margin: 12px 0; }
.info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; margin: 12px 0; }
.human-note { background: #f9f9f9; border: 1px dashed #999; padding: 8px 12px; font-style: italic; margin: 8px 0; }
.severity-blocker { color: #6c0a0a; font-weight: bold; }
.severity-error { color: #dc3545; font-weight: bold; }
.severity-warning { color: #e67e00; font-weight: bold; }
.severity-info { color: #17a2b8; }
.action-hint { background: #e8f5e9; border: 1px solid #4caf50; padding: 8px 12px; margin: 8px 0; }
.plain-explanation { background: #f0f4ff; border: 1px solid #90b0ff; padding: 8px 12px; margin: 8px 0; }
hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
</style>
</head>
<body>
"""
    import re
    lines = md.split("\n")
    in_table = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# "):
            html += f"<h1>{stripped[2:]}</h1>\n"
        elif stripped.startswith("## "):
            html += f"<h2>{stripped[3:]}</h2>\n"
        elif stripped.startswith("### "):
            html += f"<h3>{stripped[4:]}</h3>\n"
        elif stripped.startswith("**阻断原因**:"):
            val = stripped.replace("**阻断原因**:", "").strip()
            html += f'<div class="blocker"><strong>阻断原因</strong>: {val}</div>\n'
        elif stripped.startswith("**下一步操作**:"):
            val = stripped.replace("**下一步操作**:", "").strip()
            html += f'<div class="action-hint"><strong>下一步操作</strong>: {val}</div>\n'
        elif stripped.startswith("**通俗解释**:"):
            val = stripped.replace("**通俗解释**:", "").strip()
            html += f'<div class="plain-explanation"><strong>通俗解释</strong>: {val}</div>\n'
        elif stripped.startswith("**人工备注（原文）**:"):
            val = stripped.replace("**人工备注（原文）**:", "").strip().strip('"')
            html += f'<div class="human-note"><strong>人工备注（原文）</strong>: "{val}"</div>\n'
        elif stripped.startswith("| ") and "---" not in stripped:
            cells = [c.strip() for c in stripped.split("|")[1:-1]]
            if not in_table:
                html += "<table>\n<tr>"
                for c in cells:
                    html += f"<th>{c}</th>"
                html += "</tr>\n"
                in_table = True
            else:
                html += "<tr>"
                for c in cells:
                    html += f"<td>{c}</td>"
                html += "</tr>\n"
        elif stripped.startswith("|") and "---" in stripped:
            continue
        elif not stripped.startswith("|") and in_table:
            html += "</table>\n"
            in_table = False
        elif stripped.startswith("- "):
            content = stripped[2:]
            html += f"<li>{content}</li>\n"
        elif stripped == "---":
            html += "<hr>\n"
        elif stripped:
            html += f"<p>{stripped}</p>\n"

    if in_table:
        html += "</table>\n"

    html += "</body>\n</html>"
    return html


def export_report(db: Session, task_id: int, fmt: str = "markdown") -> str:
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise ValueError(f"检查任务 {task_id} 不存在")

    if fmt == "html":
        content = generate_html_report(db, task_id)
    else:
        content = generate_markdown_report(db, task_id)

    task.status = TaskStatus.REPORTED
    db.commit()

    log = AuditLog(
        task_id=task_id,
        bank_id=task.bank_id,
        action=ActionType.EXPORT,
        actor="system",
        detail=f"导出{fmt}格式报告",
        snapshot={"format": fmt},
    )
    db.add(log)
    db.commit()

    return content


def _load_report_data(db, task_id):
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise ValueError(f"检查任务 {task_id} 不存在")
    bank = db.query(QuestionBank).filter(QuestionBank.id == task.bank_id).first()
    results = db.query(CheckResult).filter(CheckResult.task_id == task_id).order_by(CheckResult.severity).all()
    return task, bank, results


def _status_label(status: TaskStatus) -> str:
    labels = {
        TaskStatus.DRAFT: "草稿",
        TaskStatus.IMPORTED: "已导入",
        TaskStatus.CHECKING: "检查中",
        TaskStatus.CHECKED: "已检查",
        TaskStatus.REVIEWING: "复核中",
        TaskStatus.APPROVED: "已通过",
        TaskStatus.REJECTED: "已驳回",
        TaskStatus.REPORTED: "已导出报告",
    }
    return labels.get(status, status.value)


def _generate_plain_summary(task: CheckTask, results: List[CheckResult]) -> str:
    if not results:
        return "本次偏科检查未发现异常，题库数据分布基本合理，可以进入下一步复核流程。"

    leakage = [r for r in results if r.check_type == CheckType.LEAKAGE]
    blocking = [r for r in results if r.is_blocking and not r.resolved]
    warnings = [r for r in results if r.severity == SeverityLevel.WARNING]

    parts = []
    parts.append(f"本次对题库「{task.task_name}」做了偏科检查，共发现 {len(results)} 条检查结果。")

    if leakage:
        overlap_types = set()
        for r in leakage:
            if r.metadata_json and "overlap_type" in r.metadata_json:
                overlap_types.add(r.metadata_json["overlap_type"])
        type_labels = {
            "train_test_overlap": "训练集和测试集有重叠",
            "val_test_overlap": "验证集和测试集有重叠",
            "train_val_overlap": "训练集和验证集有重叠",
        }
        desc = "、".join(type_labels.get(t, t) for t in overlap_types)
        parts.append(f"其中训练验证泄漏方面发现 {len(leakage)} 条问题：{desc}。")

        for r in leakage:
            if r.is_blocking and not r.resolved:
                parts.append(f"题目 {r.question_id} 被标记为阻断项，原因是{r.plain_explanation}建议操作：{r.action_hint}")
                break

    if blocking:
        parts.append(f"有 {len(blocking)} 条阻断项，必须处理完才能继续推进。")
    elif warnings:
        parts.append(f"有 {len(warnings)} 条警告，虽然不阻断流程，但建议关注。")
    else:
        parts.append("没有阻断项，但仍有部分检查结果需要注意。")

    return "".join(parts)
