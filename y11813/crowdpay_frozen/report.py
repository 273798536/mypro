import os
from typing import Dict, List, Any
from datetime import datetime

from .models import BatchReport


class ReportGenerator:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        self._ensure_dir()

    def _ensure_dir(self):
        os.makedirs(f"{self.output_dir}/human_reports", exist_ok=True)

    def generate_human_readable_report(self, report: BatchReport) -> str:
        lines = []

        lines.append("=" * 70)
        lines.append("【众包工资冻结发放报告】")
        lines.append(f"批次号：{report.batch_id}")
        lines.append(
            f"生成时间：{report.created_at.strftime('%Y年%m月%d日 %H:%M:%S')}"
        )
        lines.append("=" * 70)
        lines.append("")

        lines.append("【一、整体情况】")
        lines.append("-" * 70)
        lines.append(f"  发放总人数：{report.total_riders} 人")
        lines.append(f"  发放总金额：{report.total_amount:.2f} 元")
        lines.append(f"  冻结人数：{report.frozen_count} 人")
        lines.append(f"  冻结总金额：{report.frozen_amount:.2f} 元")
        lines.append(f"  银行卡失败人数：{len(report.bank_failures)} 人")
        lines.append(
            f"  实际发放金额：{(report.total_amount - report.frozen_amount):.2f} 元"
        )
        lines.append("")

        if report.duplicate_freezes:
            lines.append("【二、重复冻结说明（重点关注）】")
            lines.append("-" * 70)
            for i, dup in enumerate(report.duplicate_freezes, 1):
                lines.append(f"  {i}. {dup['rider_name']}(ID:{dup['rider_id']})")
                lines.append(f"     类型：{self._translate_freeze_type(dup['freeze_type'])}")
                lines.append(f"     冻结次数：{dup['count']} 次")
                lines.append(f"     涉及金额：{dup['amounts']} 元")
                lines.append(f"     操作人：{dup['operators']}")
                lines.append(f"     说明：{dup['human_reason']}")
                lines.append("")

        if report.negative_subsidies:
            lines.append("【三、补贴负数说明】")
            lines.append("-" * 70)
            for i, neg in enumerate(report.negative_subsidies, 1):
                lines.append(f"  {i}. {neg['rider_name']}(ID:{neg['rider_id']})")
                lines.append(f"     补贴项目：{neg['subsidy_name']}")
                lines.append(f"     金额：{neg['amount']:.2f} 元")
                lines.append(f"     说明：{neg['human_reason']}")
                lines.append("")

        if report.bank_failures:
            lines.append("【四、银行卡失败明细】")
            lines.append("-" * 70)
            for i, fail in enumerate(report.bank_failures, 1):
                lines.append(f"  {i}. {fail['rider_name']}(ID:{fail['rider_id']})")
                lines.append(f"     失败原因：{fail['reason']}")
                lines.append(f"     处理建议：{fail['human_reason']}")
                lines.append("")

        if report.diffs:
            lines.append("【五、工单与流水差异汇总】")
            lines.append("-" * 70)

            diff_by_field: Dict[str, List[Any]] = {}
            for d in report.diffs:
                if d.field_name not in diff_by_field:
                    diff_by_field[d.field_name] = []
                diff_by_field[d.field_name].append(d)

            for field, diffs in diff_by_field.items():
                lines.append(f"  {field}：共 {len(diffs)} 处差异")
                for i, d in enumerate(diffs[:5], 1):
                    lines.append(
                        f"    {i}. 骑手ID:{d.rider_id} "
                        f"工单值={d.ticket_value} vs 流水值={d.salary_value}"
                    )
                    if d.resolved:
                        lines.append(
                            f"       处理方式：{d.resolved_by} → 最终值={d.final_value}"
                        )
                if len(diffs) > 5:
                    lines.append(f"    ... 还有 {len(diffs) - 5} 条差异")
                lines.append("")

        if report.inconsistencies:
            lines.append("【六、与上一批次不一致说明】")
            lines.append("-" * 70)
            for i, inc in enumerate(report.inconsistencies, 1):
                lines.append(f"  {i}. {inc['type']}")
                lines.append(
                    f"     上一批次：{inc.get('previous', 'N/A')} → "
                    f"本批次：{inc.get('current', 'N/A')}"
                )
                lines.append(f"     说明：{inc['human_reason']}")
                lines.append("")

        lines.append("=" * 70)
        lines.append("报告结束")
        lines.append("=" * 70)

        report_text = "\n".join(lines)

        report_path = (
            f"{self.output_dir}/human_reports/{report.batch_id}_report.txt"
        )
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_text)

        return report_path

    def _translate_freeze_type(self, freeze_type: str) -> str:
        translations = {
            "complaint": "投诉冻结",
            "subsidy_recovery": "补贴追回",
            "bank_failed": "银行卡失败",
        }
        return translations.get(freeze_type, freeze_type)

    def generate_excel_report(
        self, report: BatchReport, riders: List[Any]
    ) -> str:
        import pandas as pd

        summary_data = [
            {
                "项目": "发放总人数",
                "数值": f"{report.total_riders} 人",
                "说明": "",
            },
            {
                "项目": "发放总金额",
                "数值": f"{report.total_amount:.2f} 元",
                "说明": "",
            },
            {
                "项目": "冻结人数",
                "数值": f"{report.frozen_count} 人",
                "说明": "",
            },
            {
                "项目": "冻结总金额",
                "数值": f"{report.frozen_amount:.2f} 元",
                "说明": "",
            },
        ]

        df_summary = pd.DataFrame(summary_data)

        rider_data = []
        for rider in riders:
            freeze_types = ",".join(
                [self._translate_freeze_type(f.freeze_type.value) for f in rider.freezes]
            )
            rider_data.append(
                {
                    "骑手ID": rider.rider_id,
                    "姓名": rider.rider_name,
                    "应发金额": rider.total_amount,
                    "冻结金额": sum(
                        f.amount
                        for f in rider.freezes
                        if f.status.value == "approved"
                    ),
                    "实发金额": rider.final_amount,
                    "冻结类型": freeze_types,
                    "发放状态": self._translate_status(rider.payment_status.value),
                }
            )
        df_riders = pd.DataFrame(rider_data)

        dup_data = []
        for i, dup in enumerate(report.duplicate_freezes, 1):
            dup_data.append(
                {
                    "序号": i,
                    "骑手ID": dup["rider_id"],
                    "姓名": dup["rider_name"],
                    "冻结类型": self._translate_freeze_type(dup["freeze_type"]),
                    "重复次数": dup["count"],
                    "涉及金额": str(dup["amounts"]),
                    "说明": dup["human_reason"],
                }
            )
        df_dups = pd.DataFrame(dup_data) if dup_data else pd.DataFrame()

        bank_data = []
        for i, fail in enumerate(report.bank_failures, 1):
            bank_data.append(
                {
                    "序号": i,
                    "骑手ID": fail["rider_id"],
                    "姓名": fail["rider_name"],
                    "失败原因": fail["reason"],
                    "处理建议": fail["human_reason"],
                }
            )
        df_bank = pd.DataFrame(bank_data) if bank_data else pd.DataFrame()

        excel_path = (
            f"{self.output_dir}/human_reports/{report.batch_id}_report.xlsx"
        )

        with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
            df_summary.to_excel(writer, sheet_name="汇总", index=False)
            df_riders.to_excel(writer, sheet_name="骑手明细", index=False)
            if not df_dups.empty:
                df_dups.to_excel(writer, sheet_name="重复冻结", index=False)
            if not df_bank.empty:
                df_bank.to_excel(writer, sheet_name="银行卡问题", index=False)

        return excel_path

    def _translate_status(self, status: str) -> str:
        translations = {
            "init": "初始化",
            "checking": "检查中",
            "frozen": "已冻结",
            "ready": "可发放",
            "processing": "发放中",
            "success": "发放成功",
            "failed": "发放失败",
            "retry": "重试中",
        }
        return translations.get(status, status)
