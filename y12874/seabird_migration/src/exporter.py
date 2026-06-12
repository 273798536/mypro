from datetime import datetime
from typing import List
import pandas as pd
import io

from .models import MergedRecord


class ReportExporter:
    def __init__(self):
        pass

    def export_to_excel(self, records: List[MergedRecord]) -> bytes:
        all_df = self._records_to_dataframe(records)
        valid_df = self._records_to_dataframe([r for r in records if r.is_valid])
        invalid_df = self._records_to_dataframe([r for r in records if not r.is_valid])
        issues_df = self._generate_issue_detail(records)
        summary_df = self._generate_summary(records)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            summary_df.to_excel(writer, sheet_name="汇总", index=False)
            all_df.to_excel(writer, sheet_name="全部记录", index=False)
            valid_df.to_excel(writer, sheet_name="有效记录", index=False)
            invalid_df.to_excel(writer, sheet_name="无效记录", index=False)
            issues_df.to_excel(writer, sheet_name="异常明细", index=False)

        output.seek(0)
        return output.read()

    def _records_to_dataframe(self, records: List[MergedRecord]) -> pd.DataFrame:
        data = [r.to_dict() for r in records]
        return pd.DataFrame(data)

    def _generate_summary(self, records: List[MergedRecord]) -> pd.DataFrame:
        total = len(records)
        valid = sum(1 for r in records if r.is_valid)
        invalid = total - valid
        tz_error = sum(1 for r in records if "潮位时区错误" in r.invalid_reason)
        photo_late = sum(1 for r in records if r.photo_late)
        ship_nearby = sum(1 for r in records if r.ship_nearby)
        photo_missing = sum(1 for r in records if not r.has_photo)
        total_birds = sum(r.bird_count for r in records if r.is_valid)
        species_count = len(set(r.species for r in records if r.is_valid))

        summary_data = [
            ["统计项", "数值", "说明"],
            ["总记录数", total, "导入的所有观测记录数量"],
            ["有效记录数", valid, "通过所有校验、可用于统计的记录"],
            ["无效记录数", invalid, "存在严重问题、不能用于统计的记录"],
            ["  其中：潮位时区错误", tz_error, "潮位数据时区不对，导致潮位数据不可靠，记录无效"],
            ["照片晚到记录数", photo_late, "照片超过时限才到，相关结论可能不准，需重新核对"],
            ["附近有船记录数", ship_nearby, "观测时附近有船舶活动，可能干扰海鸟栖息"],
            ["无照片记录数", photo_missing, "观测记录缺少对应照片，无法验证准确性"],
            ["鸟类总数量（有效记录）", total_birds, "仅统计有效记录中的鸟类数量"],
            ["鸟类种类数（有效记录）", species_count, "仅统计有效记录中的鸟类种类"],
        ]

        return pd.DataFrame(summary_data[1:], columns=summary_data[0])

    def _generate_issue_detail(self, records: List[MergedRecord]) -> pd.DataFrame:
        issue_records = [r for r in records if r.issues or r.affected_conclusions or not r.is_valid]

        rows = []
        for r in issue_records:
            issue_types = []
            if not r.is_valid:
                issue_types.append("无效记录")
            if any("潮位时区错误" in i for i in r.issues):
                issue_types.append("潮位时区错误")
            if r.photo_late:
                issue_types.append("照片晚到")
            if r.ship_nearby:
                issue_types.append("附近有船")
            if not r.has_photo:
                issue_types.append("缺少照片")

            invalid_explain = ""
            if "潮位时区错误" in issue_types:
                invalid_explain = (
                    "【潮位时区错误】该记录的潮位数据使用了错误的时区，"
                    "导致计算出的潮位与实际不符。"
                    "因潮位是海鸟栖息分析的重要依据，该记录被判定为无效，"
                    "不参与统计汇总。请联系数据提供方核对潮位数据的时区设置。"
                )

            photo_explain = ""
            if r.photo_late:
                photo_explain = (
                    "【照片晚到】该记录的照片上传时间晚于规定时限。"
                    "受影响的结论包括：①数量统计可能不准，需重新核对；"
                    "②种类识别可能有误，需重新确认；③栖息地评估需更新。"
                    "建议在照片齐全后重新生成报告。"
                )

            ship_explain = ""
            if r.ship_nearby:
                ship_explain = (
                    "【附近有船】观测时段内附近有船舶活动。"
                    "船舶活动可能惊扰海鸟，影响观测结果的代表性。"
                    "分析时需考虑船舶干扰因素。"
                )

            rows.append({
                "记录编号": r.record_id,
                "观测时间": r.obs_time.strftime("%Y-%m-%d %H:%M"),
                "地点": r.location,
                "鸟类种类": r.species,
                "数量": r.bird_count,
                "是否有效": "是" if r.is_valid else "否",
                "问题类型": "；".join(issue_types),
                "无效原因": r.invalid_reason,
                "受影响结论": "；".join(r.affected_conclusions) if r.affected_conclusions else "",
                "详细说明": " ".join(filter(None, [invalid_explain, photo_explain, ship_explain])),
            })

        return pd.DataFrame(rows)

    def export_invalid_report_text(self, records: List[MergedRecord]) -> str:
        invalid = [r for r in records if not r.is_valid]
        if not invalid:
            return "本次无无效记录。"

        lines = []
        lines.append("=" * 60)
        lines.append("海鸟迁徙观测归并 - 不可用记录清单")
        lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"不可用记录数：{len(invalid)} / {len(records)}")
        lines.append("=" * 60)
        lines.append("")

        tz_errors = [r for r in invalid if "潮位时区错误" in r.invalid_reason]
        if tz_errors:
            lines.append("一、潮位时区错误（共{}条）".format(len(tz_errors)))
            lines.append("-" * 50)
            lines.append("问题说明：")
            lines.append("  这些记录的潮位数据使用了错误的时区（如UTC而非Asia/Shanghai），")
            lines.append("  导致潮位高度和潮汐类型判断错误。")
            lines.append("  潮位是海鸟栖息和迁徙分析的关键依据，潮位数据不可靠时，")
            lines.append("  整个观测记录不能用于潮位相关分析，因此标记为无效。")
            lines.append("")
            lines.append("处理建议：")
            lines.append("  1. 联系潮位站或数据提供方，确认数据导出时的时区设置")
            lines.append("  2. 将数据时区修正为东八区（Asia/Shanghai / UTC+8）")
            lines.append("  3. 重新导入后再做归并分析")
            lines.append("")
            lines.append("受影响记录：")
            for r in tz_errors:
                lines.append(f"  - {r.record_id} | {r.obs_time.strftime('%Y-%m-%d %H:%M')} | {r.location} | {r.species} {r.bird_count}只")
                lines.append(f"    原因：{r.invalid_reason}")
            lines.append("")

        other_invalid = [r for r in invalid if "潮位时区错误" not in r.invalid_reason]
        if other_invalid:
            lines.append("二、其他无效记录（共{}条）".format(len(other_invalid)))
            lines.append("-" * 50)
            for r in other_invalid:
                lines.append(f"  - {r.record_id} | {r.obs_time.strftime('%Y-%m-%d %H:%M')} | {r.location}")
                lines.append(f"    原因：{r.invalid_reason}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("注：无效记录不参与数量统计和种类分布分析。")
        lines.append("    详细数据请查看导出的Excel文件「无效记录」和「异常明细」工作表。")
        lines.append("=" * 60)

        return "\n".join(lines)
