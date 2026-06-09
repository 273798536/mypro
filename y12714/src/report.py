"""
报告导出
========
为投委会等非技术读者准备清晰可读的复核报告，
特别是对近似误差过大的拦截原因给出解释。
"""

import csv
from pathlib import Path
from typing import Dict, List
from datetime import datetime

from .models import (
    ReviewRecord,
    ReviewStatus,
    ErrorType,
    Question,
    AnswerRecord,
)
from .storage import ensure_dir


STATUS_LABELS = {
    ReviewStatus.PASS: "通过",
    ReviewStatus.PENDING: "待确认（数据缺失）",
    ReviewStatus.REJECTED: "未通过",
    ReviewStatus.AFFECTED: "受历史答案晚到影响，需重新复核",
}

ERROR_LABELS = {
    ErrorType.NONE: "无",
    ErrorType.APPROXIMATION: "近似误差过大",
    ErrorType.EMPTY_SET: "空集合（缺少答案或标准答案）",
    ErrorType.INVALID_DATA: "数据格式非法",
    ErrorType.LATE_ANSWER: "历史答案晚到",
}


def _fmt_pct(x) -> str:
    if x is None:
        return "—"
    try:
        return f"{x * 100:.2f}%"
    except (TypeError, ValueError):
        return str(x)


def _fmt_num(x, digits: int = 6) -> str:
    if x is None:
        return "—"
    try:
        return f"{float(x):.{digits}f}"
    except (TypeError, ValueError):
        return str(x)


def export_csv_report(
    output_path: Path,
    reviews: List[ReviewRecord],
    questions: Dict[str, Question],
    answers: Dict[str, AnswerRecord],
) -> Path:
    """
    导出 CSV 格式复核报告。
    重点突出近似误差过大的拦截原因，让投委会即便只看报告也能明白。
    """
    ensure_dir(output_path.parent)

    fieldnames = [
        "复核记录ID",
        "答题记录ID",
        "题目ID",
        "批次ID",
        "复核状态",
        "错误类型",
        "学生答案",
        "标准答案",
        "容差",
        "误差大小",
        "误差阈值",
        "拦截/待处理原因",
        "反例数量",
        "是否受晚到答案影响",
        "关联晚到答案记录",
        "前次状态",
        "复核时间",
        "运行ID",
    ]

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for r in sorted(reviews, key=lambda x: (x.batch_id, x.question_id, x.record_id)):
            q = questions.get(r.question_id)
            a = answers.get(r.record_id)
            ea = r.error_analysis

            reason = ""
            if r.status == ReviewStatus.PASS:
                reason = "答案在容差范围内，统计显著性复核通过。"
            elif r.status == ReviewStatus.AFFECTED:
                reason = (
                    "有历史答案晚到，之前的复核结论可能已发生变化，"
                    "请人工确认当前状态。"
                )
            elif ea:
                if ea.error_type == ErrorType.APPROXIMATION:
                    reason = (
                        f"近似误差过大，已拦截。"
                        f"误差幅度 {_fmt_pct(ea.error_magnitude)}，阈值 {_fmt_pct(ea.threshold)}；"
                        f"{ea.details}"
                    )
                elif ea.error_type == ErrorType.EMPTY_SET:
                    reason = (
                        f"空集合输入，无法完成复核。"
                        f"{ea.details}"
                    )
                elif ea.error_type == ErrorType.INVALID_DATA:
                    reason = (
                        f"数据格式非法，无法进行数值比较。"
                        f"{ea.details}"
                    )
                else:
                    reason = ea.details

            writer.writerow(
                {
                    "复核记录ID": r.review_id,
                    "答题记录ID": r.record_id,
                    "题目ID": r.question_id,
                    "批次ID": r.batch_id,
                    "复核状态": STATUS_LABELS.get(r.status, r.status.value),
                    "错误类型": ERROR_LABELS.get(ea.error_type, "—") if ea else "—",
                    "学生答案": _fmt_num(a.student_answer) if a else "—",
                    "标准答案": _fmt_num(q.correct_answer) if q and q.correct_answer is not None else "—",
                    "容差": _fmt_num(q.tolerance) if q else "—",
                    "误差大小": _fmt_pct(ea.error_magnitude) if ea and ea.error_magnitude is not None else "—",
                    "误差阈值": _fmt_pct(ea.threshold) if ea and ea.threshold is not None else "—",
                    "拦截/待处理原因": reason,
                    "反例数量": len(ea.counter_examples) if ea else 0,
                    "是否受晚到答案影响": "是" if r.affected_by_late_answer else "否",
                    "关联晚到答案记录": ", ".join(r.late_answer_record_ids) if r.late_answer_record_ids else "—",
                    "前次状态": STATUS_LABELS.get(r.previous_status, "—") if r.previous_status else "—",
                    "复核时间": r.reviewed_at,
                    "运行ID": r.run_id,
                }
            )

    return output_path


def export_counterexamples_md(
    output_path: Path,
    reviews: List[ReviewRecord],
    questions: Dict[str, Question],
) -> Path:
    """
    导出具反例详情的 Markdown 文档，供排课老师深入查看近似误差过大的记录。
    """
    ensure_dir(output_path.parent)
    lines: List[str] = []
    lines.append("# 统计显著性复核 - 异常记录反例详情")
    lines.append("")
    lines.append(f"_生成时间：{datetime.now().isoformat()}_")
    lines.append("")

    rejected = [r for r in reviews if r.status == ReviewStatus.REJECTED and r.error_analysis]
    pending = [r for r in reviews if r.status == ReviewStatus.PENDING]
    affected = [r for r in reviews if r.status == ReviewStatus.AFFECTED]

    lines.append(f"- 未通过记录：{len(rejected)} 条")
    lines.append(f"- 待确认记录：{len(pending)} 条")
    lines.append(f"- 受晚到答案影响：{len(affected)} 条")
    lines.append("")

    def _section(title: str, items: List[ReviewRecord]):
        if not items:
            return
        lines.append(f"## {title}")
        lines.append("")
        for idx, r in enumerate(items, 1):
            q = questions.get(r.question_id)
            ea = r.error_analysis
            lines.append(f"### {idx}. 记录 {r.record_id}（题目 {r.question_id}）")
            lines.append("")
            lines.append(f"- **复核状态**：{STATUS_LABELS.get(r.status, r.status.value)}")
            if ea:
                lines.append(f"- **错误类型**：{ERROR_LABELS.get(ea.error_type, ea.error_type.value)}")
                lines.append(f"- **详细说明**：{ea.details}")
            if r.affected_by_late_answer:
                lines.append(
                    f"- **注意**：此记录受历史答案晚到影响，"
                    f"前次状态为 {STATUS_LABELS.get(r.previous_status, '—')}，"
                    f"请重新复核。"
                )
            lines.append("")
            if ea and ea.counter_examples:
                lines.append("#### 反例")
                lines.append("")
                lines.append("| # | 说明 | 输入 | 期望值 | 实际值 | 误差幅度 |")
                lines.append("|---|------|------|--------|--------|----------|")
                for i, ce in enumerate(ea.counter_examples, 1):
                    inp_str = ", ".join(f"{k}={v}" for k, v in ce.input_values.items())
                    lines.append(
                        f"| {i} | {ce.description} | {inp_str} | "
                        f"{_fmt_num(ce.expected)} | {_fmt_num(ce.actual)} | "
                        f"{_fmt_num(ce.error_magnitude)} |"
                    )
                lines.append("")
            lines.append("---")
            lines.append("")

    _section("一、未通过（近似误差过大 / 数据非法）", rejected)
    _section("二、待确认（空集合输入）", pending)
    _section("三、受历史答案晚到影响", affected)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def export_summary_txt(
    output_path: Path,
    reviews: List[ReviewRecord],
) -> Path:
    """
    导出简明统计摘要，方便排课老师快速查看异常。
    """
    ensure_dir(output_path.parent)
    total = len(reviews)
    passed = sum(1 for r in reviews if r.status == ReviewStatus.PASS)
    pending = sum(1 for r in reviews if r.status == ReviewStatus.PENDING)
    rejected = sum(1 for r in reviews if r.status == ReviewStatus.REJECTED)
    affected = sum(1 for r in reviews if r.status == ReviewStatus.AFFECTED)

    lines = [
        "统计显著性复核 - 运行摘要",
        "=" * 40,
        f"生成时间   : {datetime.now().isoformat()}",
        f"总记录数   : {total}",
        f"通过       : {passed}",
        f"待确认     : {pending}  （空集合或缺少标准答案，需补录后重新运行）",
        f"未通过     : {rejected} （近似误差过大或数据非法，已拦截）",
        f"受晚到影响 : {affected} （有历史答案晚到，原结论可能变更）",
        "",
    ]

    if affected:
        lines.append("[!] 以下记录受历史答案晚到影响，请重点复核：")
        for r in reviews:
            if r.status == ReviewStatus.AFFECTED:
                prev = r.previous_status.value if r.previous_status else "—"
                lines.append(
                    f"    - {r.record_id}（题目 {r.question_id}）："
                    f"前次={prev}，当前需重新确认"
                )
        lines.append("")

    if rejected:
        lines.append("[!] 以下记录因近似误差过大被拦截：")
        for r in reviews:
            if r.status == ReviewStatus.REJECTED and r.error_analysis:
                ea = r.error_analysis
                lines.append(
                    f"    - {r.record_id}（题目 {r.question_id}）："
                    f"{ERROR_LABELS.get(ea.error_type, ea.error_type.value)}，"
                    f"误差={_fmt_pct(ea.error_magnitude)}，阈值={_fmt_pct(ea.threshold)}"
                )
        lines.append("")

    if pending:
        lines.append("[!] 以下记录缺少必要数据，待补录：")
        for r in reviews:
            if r.status == ReviewStatus.PENDING:
                msg = r.error_analysis.details if r.error_analysis else "—"
                lines.append(f"    - {r.record_id}（题目 {r.question_id}）：{msg}")
        lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path
