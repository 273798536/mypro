from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models import (
    QuestionBank, Question, CheckTask, CheckResult, TaskStatus,
    CheckType, SeverityLevel, AuditLog, ActionType,
)
from app.services.check_service import get_unresolved_blocking_results

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
    from html import escape as html_escape

    blocking_results = [r for r in results if r.is_blocking and not r.resolved]
    leakage_results = [r for r in results if r.check_type == CheckType.LEAKAGE]
    other_results = [r for r in results if r.check_type != CheckType.LEAKAGE]
    other_by_type: Dict[str, List[CheckResult]] = {}
    for r in other_results:
        ct_label = CHECK_TYPE_LABELS.get(r.check_type, r.check_type.value)
        if ct_label not in other_by_type:
            other_by_type[ct_label] = []
        other_by_type[ct_label].append(r)

    logs = db.query(AuditLog).filter(
        (AuditLog.task_id == task_id) | (AuditLog.bank_id == task.bank_id)
    ).order_by(AuditLog.created_at).all()

    def esc(s: str) -> str:
        return html_escape(s or "")

    def sev_html(sev) -> str:
        cls = f"severity-{sev.value}"
        return f'<span class="{cls}">{SEVERITY_LABELS.get(sev, sev.value)}</span>'

    def sev_block(r: CheckResult) -> str:
        if r.severity == SeverityLevel.BLOCKER:
            cls = "blocker"
        elif r.severity == SeverityLevel.ERROR:
            cls = "error"
        elif r.severity == SeverityLevel.WARNING:
            cls = "warning"
        else:
            cls = "info"
        return cls

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>模型评测题库偏科检查报告 — {esc(task.task_name)}</title>
<style>
body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.8; }}
h1 {{ border-bottom: 2px solid #1a73e8; padding-bottom: 8px; color: #1a73e8; }}
h2 {{ border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px; }}
h3 {{ margin-top: 20px; }}
.meta-table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
.meta-table th, .meta-table td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
.meta-table th {{ background: #f5f5f5; width: 120px; }}
.result-table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
.result-table th, .result-table td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; vertical-align: top; }}
.result-table th {{ background: #f5f5f5; }}
.blocker {{ background: #ffe0e0; border-left: 4px solid #dc3545; padding: 12px 16px; margin: 12px 0; }}
.error {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 12px 0; }}
.warning {{ background: #fff8e1; border-left: 4px solid #ff9800; padding: 12px 16px; margin: 12px 0; }}
.info {{ background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; margin: 12px 0; }}
.human-note {{ background: #f9f9f9; border: 1px dashed #999; padding: 8px 12px; font-style: italic; margin: 8px 0; }}
.severity-blocker {{ color: #6c0a0a; font-weight: bold; }}
.severity-error {{ color: #dc3545; font-weight: bold; }}
.severity-warning {{ color: #e67e00; font-weight: bold; }}
.severity-info {{ color: #17a2b8; }}
.action-hint {{ background: #e8f5e9; border: 1px solid #4caf50; padding: 8px 12px; margin: 8px 0; border-radius: 4px; }}
.plain-explanation {{ background: #f0f4ff; border: 1px solid #90b0ff; padding: 8px 12px; margin: 8px 0; border-radius: 4px; }}
.plain-summary {{ background: #f8fbff; border: 1px solid #b0c4de; padding: 12px 16px; margin: 12px 0; border-radius: 6px; }}
hr {{ border: none; border-top: 1px solid #eee; margin: 24px 0; }}
code {{ background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }}
ul {{ padding-left: 20px; }}
.resolved {{ text-decoration: line-through; opacity: 0.6; }}
</style>
</head>
<body>

<h1>模型评测题库偏科检查报告</h1>

<table class="meta-table">
  <tr><th>题库名称</th><td>{esc(bank.name)}</td></tr>
  <tr><th>检查任务</th><td>{esc(task.task_name)}</td></tr>
  <tr><th>任务状态</th><td>{esc(_status_label(task.status))}</td></tr>
  <tr><th>生成时间</th><td>{esc(datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))}</td></tr>
"""
    if task.reviewer:
        html += f'  <tr><th>复核人</th><td>{esc(task.reviewer)}</td></tr>\n'
    if task.review_comment:
        html += f'  <tr><th>复核意见</th><td>{esc(task.review_comment)}</td></tr>\n'
    html += "</table>\n"

    html += "<hr>\n"
    html += "<h2>概述（普通话说明）</h2>\n"
    html += f'<div class="plain-summary">{esc(_generate_plain_summary(task, results))}</div>\n'

    if blocking_results:
        html += "<hr>\n"
        html += "<h2>🚫 阻断项（必须处理）</h2>\n"
        html += "<p>以下问题必须在通过复核前解决：</p>\n"
        for i, r in enumerate(blocking_results, 1):
            html += f'<div class="{sev_block(r)}">\n'
            html += f'<h3>阻断项 {i}: {esc(CHECK_TYPE_LABELS.get(r.check_type, r.check_type.value))} — {sev_html(r.severity)}</h3>\n'
            html += f'<table class="meta-table">\n'
            html += f'  <tr><th>涉及题目</th><td>{esc(r.question_id or "全局")}</td></tr>\n'
            html += f'  <tr><th>问题详情</th><td>{esc(r.detail)}</td></tr>\n'
            html += f"</table>\n"
            html += f'<div class="plain-explanation"><strong>通俗解释</strong>: {esc(r.plain_explanation)}</div>\n'
            html += f'<div class="action-hint"><strong>下一步操作</strong>: {esc(r.action_hint)}</div>\n'
            if r.original_human_note:
                html += f'<div class="human-note"><strong>人工备注（原文）</strong>: "{esc(r.original_human_note)}"</div>\n'
            if r.metadata_json and "blocking_reason" in r.metadata_json:
                html += f'<div class="blocker"><strong>阻断原因</strong>: {esc(r.metadata_json["blocking_reason"])}</div>\n'
            if r.resolved:
                html += f'<p class="resolved"><strong>已解决</strong>: {esc(r.resolution)}</p>\n'
            html += "</div>\n"

    if leakage_results:
        html += "<hr>\n"
        html += "<h2>训练验证泄漏详情</h2>\n"
        html += "<p>以下是训练集、验证集和测试集之间存在的数据泄漏记录。每条记录都附有通俗解释和处理建议，帮助判断下一步该补材料还是改口径。</p>\n"
        for i, r in enumerate(leakage_results, 1):
            html += f'<div class="{sev_block(r)}">\n'
            html += f'<h3>泄漏记录 {i}</h3>\n'
            html += '<table class="result-table">\n'
            html += f'  <tr><th>严重级别</th><td>{sev_html(r.severity)}</td></tr>\n'
            html += f'  <tr><th>涉及题目</th><td>{esc(r.question_id or "全局")}</td></tr>\n'
            html += f'  <tr><th>问题详情</th><td>{esc(r.detail)}</td></tr>\n'
            html += f'  <tr><th>通俗解释</th><td>{esc(r.plain_explanation)}</td></tr>\n'
            html += f'  <tr><th>下一步操作</th><td>{esc(r.action_hint)}</td></tr>\n'
            if r.original_human_note:
                html += f'  <tr><th>人工备注（原文）</th><td>"{esc(r.original_human_note)}"</td></tr>\n'
            if r.metadata_json and "blocking_reason" in r.metadata_json:
                html += f'  <tr><th>阻断原因</th><td>{esc(r.metadata_json["blocking_reason"])}</td></tr>\n'
            html += f'  <tr><th>是否阻断</th><td>{"是" if r.is_blocking else "否"}</td></tr>\n'
            if r.resolved:
                html += f'  <tr><th>已解决</th><td>是 — {esc(r.resolution)}</td></tr>\n'
            else:
                html += '  <tr><th>已解决</th><td>否</td></tr>\n'
            html += "</table>\n"
            html += "</div>\n"

    if other_by_type:
        html += "<hr>\n"
        html += "<h2>其他检查结果</h2>\n"
        for ct_label, ct_results in other_by_type.items():
            html += f"<h3>{esc(ct_label)}</h3>\n"
            for r in ct_results:
                html += f'<div class="{sev_block(r)}">\n'
                html += f'<p><strong>{sev_html(r.severity)}</strong> {esc(r.detail)}</p>\n'
                if r.plain_explanation:
                    html += f'<div class="plain-explanation"><strong>通俗解释</strong>: {esc(r.plain_explanation)}</div>\n'
                if r.action_hint:
                    html += f'<div class="action-hint"><strong>处理建议</strong>: {esc(r.action_hint)}</div>\n'
                if r.original_human_note:
                    html += f'<div class="human-note"><strong>人工备注（原文）</strong>: "{esc(r.original_human_note)}"</div>\n'
                if r.resolved:
                    html += f'<p class="resolved"><strong>已解决</strong>: {esc(r.resolution)}</p>\n'
                html += "</div>\n"

    html += "<hr>\n"
    html += "<h2>操作历史</h2>\n"
    html += "<ul>\n"
    for log in logs:
        html += f'<li><code>{esc(log.created_at.strftime("%Y-%m-%d %H:%M"))}</code> [{esc(log.action.value)}] {esc(log.actor)}: {esc(log.detail)}</li>\n'
    html += "</ul>\n"

    html += "</body>\n</html>"
    return html


def export_report(db: Session, task_id: int, fmt: str = "markdown") -> str:
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise ValueError(f"检查任务 {task_id} 不存在")

    if task.status not in (TaskStatus.REVIEWING, TaskStatus.APPROVED, TaskStatus.REPORTED):
        if task.status == TaskStatus.CHECKED:
            raise ValueError(f"任务当前状态为「{task.status.value}」，还未进入复核阶段，请先推进到「reviewing」后再导出")
        raise ValueError(f"任务当前状态为「{task.status.value}」，不满足导出条件（需处于复核中、已通过或已导出报告）")

    blocking_results = get_unresolved_blocking_results(db, task_id)
    if blocking_results:
        detail_items = []
        for r in blocking_results:
            qid = r.question_id or "全局"
            detail_items.append(f"[{r.check_type.value}] {qid}: {r.detail[:60]}")
        raise ValueError(
            f"存在 {len(blocking_results)} 条未解决的阻断项，不能导出报告。"
            f"未解决项：{'; '.join(detail_items)}。"
            f"请先在「results/resolve」接口标记为已解决后再导出。"
        )

    if fmt == "html":
        content = generate_html_report(db, task_id)
    else:
        content = generate_markdown_report(db, task_id)

    if task.status != TaskStatus.REPORTED:
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
