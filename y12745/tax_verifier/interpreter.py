from typing import List
from .models import VerificationResult, BatchReport, ResultStatus, BoundaryFlag


class ResultInterpreter:
    def __init__(self, report: BatchReport):
        self.report = report

    def console_summary(self) -> str:
        r = self.report
        lines = [
            "=" * 60,
            f"  税率阶梯函数核验报告  生成时间: {r.generated_at:%Y-%m-%d %H:%M:%S}",
            "=" * 60,
            f"  总记录数:    {r.total_records}",
            f"  可用:        {r.usable_count}",
            f"  暂缓:        {r.pending_count}",
            f"  需重采集:    {r.need_recollect_count}",
            f"  待工程师复核:{r.need_review_count}",
            f"  重复样本:    {r.duplicate_count}",
            f"  边界样例:    {r.boundary_count}",
            f"  准确率:      {r.accuracy_rate * 100:.1f}%",
            "=" * 60,
        ]
        return "\n".join(lines)

    @staticmethod
    def _status_icon(status: ResultStatus) -> str:
        return {
            ResultStatus.USABLE: "✅",
            ResultStatus.PENDING: "⏸",
            ResultStatus.NEED_RECOLLECT: "🗑",
            ResultStatus.NEED_REVIEW: "⚠",
        }.get(status, "?")

    @staticmethod
    def _boundary_icon(flag: BoundaryFlag) -> str:
        return {
            BoundaryFlag.NORMAL: "   ",
            BoundaryFlag.LOWER_BOUNDARY: " 🔻下边界",
            BoundaryFlag.UPPER_BOUNDARY: " 🔺上边界",
            BoundaryFlag.ACROSS_BOUNDARY: " ⚡临界点",
            BoundaryFlag.OUT_OF_RANGE: " 🚫超范围",
        }.get(flag, "")

    def detail_table(self) -> str:
        if not self.report.results:
            return "  (输入为空集合，无明细可展示)"
        header = f"  {'状态':<4} {'边界':<10} {'ID':<12} {'收入':>12} {'申报税':>10} {'理论税':>10} {'差额':>10}  来源追溯"
        sep = "  " + "-" * 90
        rows = [header, sep]
        for r in self.report.results:
            icon = self._status_icon(r.status)
            bicon = self._boundary_icon(r.boundary_flag).strip()
            src = r.record.source_ref.summary()
            dup_tag = " [重复]" if r.is_duplicate else ""
            rows.append(
                f"  {icon} {r.status.value:<4} {bicon:<10} {r.record.record_id:<12} "
                f"{r.record.income_amount:>12,.2f} {r.claimed_tax:>10,.2f} "
                f"{r.expected_tax:>10,.2f} {r.tax_diff:>+10,.2f}{dup_tag}  {src}"
            )
        return "\n".join(rows)

    def explanation_block(self) -> str:
        if not self.report.results:
            return "  说明: 本次提交空集合输入，未执行任何核验。"
        lines = ["", "  ┌─ 逐条说明 ────────────────────────────────────────┐"]
        for r in self.report.results:
            status_word = {
                ResultStatus.USABLE: "【可用】",
                ResultStatus.PENDING: "【暂缓】",
                ResultStatus.NEED_RECOLLECT: "【需重采集】",
                ResultStatus.NEED_REVIEW: "【待工程师复核】",
            }[r.status]
            lines.append(f"  │ {r.record.record_id} {status_word}")
            lines.append(f"  │   结论: {r.explanation}")
            if r.matched_step:
                lines.append(
                    f"  │   阶梯: {r.matched_step.lower_bound:,.0f} ≤ 收入 < {r.matched_step.upper_bound:,.0f}"
                    f"  税率 {r.matched_step.tax_rate * 100:.0f}%  速算扣除 {r.matched_step.quick_deduction:,.0f}"
                )
            if r.constraint_violations:
                for v in r.constraint_violations:
                    lines.append(f"  │   约束: {v}")
            if r.is_duplicate:
                lines.append(f"  │   重复: 与 {r.duplicate_of} 为重复样本，人工确认是否同一材料")
            lines.append(f"  │   来源: {r.record.source_ref.summary()}")
            lines.append("  ├───────────────────────────────────────────────────┤")
        lines[-1] = "  └───────────────────────────────────────────────────┘"
        return "\n".join(lines)

    def student_view(self) -> str:
        parts = [self.console_summary(), "", "  ▶ 明细列表:", self.detail_table(), self.explanation_block()]
        return "\n".join(parts)

    def export_csv_rows(self) -> List[List[str]]:
        header = [
            "记录ID", "状态", "边界标记", "收入金额", "申报税额", "理论税额",
            "差额", "阶梯下界", "阶梯上界", "税率", "速算扣除",
            "是否重复", "重复来源", "约束违规", "说明",
            "原始行号", "图片名", "工作表", "来源备注",
        ]
        rows = [header]
        for r in self.report.results:
            step = r.matched_step
            rows.append([
                r.record.record_id,
                r.status.value,
                r.boundary_flag.value,
                f"{r.record.income_amount:.2f}",
                f"{r.claimed_tax:.2f}",
                f"{r.expected_tax:.2f}",
                f"{r.tax_diff:.2f}",
                f"{step.lower_bound:.2f}" if step else "",
                f"{step.upper_bound:.2f}" if step and step.upper_bound != float("inf") else "∞",
                f"{step.tax_rate * 100:.1f}%" if step else "",
                f"{step.quick_deduction:.2f}" if step else "",
                "是" if r.is_duplicate else "否",
                r.duplicate_of or "",
                ";".join(r.constraint_violations),
                r.explanation,
                str(r.record.source_ref.original_line_no or ""),
                r.record.source_ref.image_name or "",
                r.record.source_ref.sheet_name or "",
                r.record.source_ref.source_note or "",
            ])
        return rows
