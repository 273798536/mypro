import csv
import json
import os
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path

from models import ProcessingResult, MergedPointGroup, MergeStatus


class OutputGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_all(self, result: ProcessingResult) -> Dict[str, str]:
        outputs = {}
        outputs["filter_criteria"] = self.save_text_output(
            f"筛选条件_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            self.generate_filter_criteria_text(result)
        )
        outputs["statistics"] = self.save_text_output(
            f"统计数字_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            self.generate_statistics_text(result)
        )
        outputs["summary_table"] = self.save_text_output(
            f"明细表_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            self.generate_summary_table_text(result)
        )
        outputs["csv_detail"] = self.generate_detail_csv(result)
        outputs["csv_groups"] = self.generate_groups_csv(result)
        outputs["csv_records"] = self.generate_records_csv(result)
        outputs["json_full"] = self.generate_full_json(result)
        outputs["handler_view"] = self.save_text_output(
            f"算法值班人视图_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            self.generate_handler_view_text(result)
        )
        outputs["handoff_report"] = self.save_text_output(
            f"交接报告_市政设计老曹_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            self.generate_handoff_report(result)
        )
        return outputs

    def generate_filter_criteria_text(self, result: ProcessingResult) -> str:
        fc = result.filter_criteria.to_dict()
        lines = [
            "=" * 60,
            "口袋公园座椅点位归并 - 筛选条件",
            "=" * 60,
            f"生成时间: {result.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            "-" * 60,
        ]
        label_map = {
            "start_date": "起始日期",
            "end_date": "结束日期",
            "data_sources": "数据来源",
            "merge_statuses": "归并状态",
            "min_record_count": "最少记录数",
            "location_keywords": "位置关键词",
        }
        for key, label in label_map.items():
            value = fc.get(key, "")
            if value:
                lines.append(f"{label}: {value}")
            else:
                lines.append(f"{label}: (未设置)")
        lines.append("=" * 60)
        return "\n".join(lines)

    def generate_statistics_text(self, result: ProcessingResult) -> str:
        st = result.statistics.to_dict()
        lines = [
            "=" * 60,
            "口袋公园座椅点位归并 - 统计数字",
            "=" * 60,
            f"生成时间: {result.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            "-" * 60,
            f"总原始记录数: {st['总原始记录数']}",
            f"总归并组数:   {st['总归并组数']}",
            "-" * 60,
            "按来源统计:",
        ]
        for source, count in st["按来源统计"].items():
            lines.append(f"  {source}: {count} 条")
        lines.append("-" * 60)
        lines.append("按归并状态统计:")
        for status, count in st["按归并状态统计"].items():
            lines.append(f"  {status}: {count} 组")
        lines.append("-" * 60)
        lines.append("按投诉状态统计:")
        for status, count in st["按投诉状态统计"].items():
            lines.append(f"  {status}: {count} 组")
        lines.append("-" * 60)
        lines.append(f"重复投诉组数:   {st['重复投诉组数']}")
        lines.append(f"待补证据组数:   {st['待补证据组数']}")
        lines.append(f"待处理组数:     {st['待处理组数']}")
        lines.append(f"已复核组数:     {st['已复核组数']}")
        lines.append("=" * 60)
        return "\n".join(lines)

    def generate_summary_table_text(self, result: ProcessingResult) -> str:
        lines = [
            "=" * 100,
            "口袋公园座椅点位归并 - 明细表",
            "=" * 100,
            f"生成时间: {result.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            "-" * 100,
            f"{'归并组ID':<20} {'规范位置':<30} {'记录数':<6} {'重复数':<6} {'归并状态':<10} {'投诉状态':<10}",
            "-" * 100,
        ]
        for g in result.merged_groups:
            lines.append(
                f"{g.group_id:<20} {g.canonical_location[:28]:<30} "
                f"{g.record_count:<6} {g.duplicate_count:<6} "
                f"{g.merge_status.value:<10} {g.complaint_status.value:<10}"
            )
        lines.append("=" * 100)
        return "\n".join(lines)

    def generate_detail_csv(self, result: ProcessingResult) -> str:
        file_path = self.output_dir / f"口袋公园座椅点位归并明细_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(file_path, mode='w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "归并组ID", "规范位置", "记录ID", "原始位置文本",
                "数据来源", "投诉内容", "投诉时间", "投诉人",
                "审批编号", "经度", "纬度", "备注"
            ])
            for g in result.merged_groups:
                for r in g.merged_records:
                    writer.writerow([
                        g.group_id,
                        g.canonical_location,
                        r.record_id,
                        r.original_location_text,
                        r.source.value,
                        r.complaint_content or "",
                        r.complaint_time.strftime("%Y-%m-%d %H:%M:%S") if r.complaint_time else "",
                        r.complainant or "",
                        r.approval_number or "",
                        r.longitude if r.longitude else "",
                        r.latitude if r.latitude else "",
                        r.notes or "",
                    ])
        return str(file_path)

    def generate_groups_csv(self, result: ProcessingResult) -> str:
        file_path = self.output_dir / f"口袋公园座椅点位归并组_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(file_path, mode='w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "归并组ID", "规范位置", "记录数", "重复投诉数",
                "归并状态", "投诉状态", "归并证据",
                "处理备注", "下一步操作提示", "归并时间",
                "包含记录ID", "原始位置写法"
            ])
            for g in result.merged_groups:
                writer.writerow([
                    g.group_id,
                    g.canonical_location,
                    g.record_count,
                    g.duplicate_count,
                    g.merge_status.value,
                    g.complaint_status.value,
                    "\n".join(g.merge_evidence),
                    g.handler_notes or "",
                    g.next_step_hint or "",
                    g.merged_at.strftime("%Y-%m-%d %H:%M:%S") if g.merged_at else "",
                    "; ".join([r.record_id for r in g.merged_records]),
                    " || ".join([r.original_location_text for r in g.merged_records]),
                ])
        return str(file_path)

    def generate_records_csv(self, result: ProcessingResult) -> str:
        file_path = self.output_dir / f"口袋公园座椅点位原始记录_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(file_path, mode='w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "记录ID", "数据来源", "原始位置文本", "归一化位置",
                "经度", "纬度", "投诉内容", "投诉时间",
                "投诉人", "审批编号", "备注", "原始数据(JSON)"
            ])
            for r in result.raw_records:
                writer.writerow([
                    r.record_id,
                    r.source.value,
                    r.original_location_text,
                    r.normalized_location or "",
                    r.longitude if r.longitude else "",
                    r.latitude if r.latitude else "",
                    r.complaint_content or "",
                    r.complaint_time.strftime("%Y-%m-%d %H:%M:%S") if r.complaint_time else "",
                    r.complainant or "",
                    r.approval_number or "",
                    r.notes or "",
                    json.dumps(r.raw_data, ensure_ascii=False),
                ])
        return str(file_path)

    def generate_full_json(self, result: ProcessingResult) -> str:
        file_path = self.output_dir / f"口袋公园座椅点位归并完整数据_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        data = {
            "generated_at": result.generated_at.strftime("%Y-%m-%d %H:%M:%S"),
            "filter_criteria": result.filter_criteria.to_dict(),
            "statistics": result.statistics.to_dict(),
            "merged_groups": [g.to_dict() for g in result.merged_groups],
            "raw_records": [r.to_dict() for r in result.raw_records],
        }
        with open(file_path, mode='w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def generate_handler_view_text(self, result: ProcessingResult) -> str:
        pending = [g for g in result.merged_groups if g.merge_status in (MergeStatus.PENDING, MergeStatus.NEEDS_EVIDENCE)]
        done = [g for g in result.merged_groups if g.merge_status in (MergeStatus.MERGED, MergeStatus.REVIEWED)]

        lines = [
            "=" * 80,
            "口袋公园座椅点位归并 - 算法值班人视图",
            "=" * 80,
            f"生成时间: {result.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"待处理/待补证据: {len(pending)} 组 | 已归并/已复核: {len(done)} 组",
            "=" * 80,
        ]

        if pending:
            lines.append("")
            lines.append("【需要处理的归并组】")
            lines.append("-" * 80)
            for g in pending:
                lines.append(f"▶ 归并组 {g.group_id}")
                lines.append(f"  规范位置: {g.canonical_location}")
                lines.append(f"  记录数: {g.record_count} | 状态: {g.merge_status.value} | 投诉: {g.complaint_status.value}")
                lines.append(f"  原始位置写法:")
                for r in g.merged_records:
                    lines.append(f"    - [{r.source.value}] {r.original_location_text} (ID: {r.record_id})")
                if g.merge_evidence:
                    lines.append(f"  归并证据:")
                    for ev in g.merge_evidence[:3]:
                        lines.append(f"    · {ev}")
                    if len(g.merge_evidence) > 3:
                        lines.append(f"    · ... 共 {len(g.merge_evidence)} 条")
                if g.next_step_hint:
                    lines.append(f"  下一步操作:")
                    for step in g.next_step_hint.split("\n"):
                        lines.append(f"    {step}")
                lines.append("")

        if done:
            lines.append("")
            lines.append("【已处理的归并组】")
            lines.append("-" * 80)
            for g in done:
                lines.append(f"✓ {g.group_id} | {g.canonical_location} | {g.record_count}条记录 | {g.merge_status.value}")

        lines.append("=" * 80)
        return "\n".join(lines)

    def generate_handoff_report(self, result: ProcessingResult) -> str:
        lines = [
            "=" * 80,
            "口袋公园座椅点位归并 - 交接报告（市政设计老曹用）",
            "=" * 80,
            f"生成时间: {result.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "【使用说明】",
            "  1. 下方每个归并组均标注了数据来源和原始记录ID",
            "  2. 可通过记录ID在审批台账中找到原始说法",
            "  3. 可通过CSV明细文件（output/目录下）查看完整处理结果",
            "  4. 原始数据已全部保留，未做清洗修改",
            "",
            "-" * 80,
            "归并组汇总:",
            f"  总归并组数: {len(result.merged_groups)}",
            f"  涉及原始记录: {len(result.raw_records)} 条",
            "=" * 80,
        ]

        for idx, g in enumerate(result.merged_groups, 1):
            lines.append("")
            lines.append(f"【归并组 {idx}】 {g.group_id}")
            lines.append(f"  规范位置: {g.canonical_location}")
            lines.append(f"  归并状态: {g.merge_status.value} | 投诉状态: {g.complaint_status.value}")
            lines.append("")
            lines.append("  原始记录明细（可据此查找审批台账）:")
            for r_idx, r in enumerate(g.merged_records, 1):
                lines.append(f"    {r_idx}. [{r.source.value}] ID={r.record_id}")
                lines.append(f"       原始位置: {r.original_location_text}")
                if r.approval_number:
                    lines.append(f"       审批编号: {r.approval_number}")
                if r.complaint_time:
                    lines.append(f"       投诉时间: {r.complaint_time.strftime('%Y-%m-%d %H:%M:%S')}")
                if r.complainant:
                    lines.append(f"       投诉人: {r.complainant}")
                if r.complaint_content:
                    lines.append(f"       投诉内容: {r.complaint_content}")
            lines.append("")
            lines.append("  归并依据:")
            for ev in g.merge_evidence:
                lines.append(f"    · {ev}")
            if g.handler_notes:
                lines.append(f"  处理备注: {g.handler_notes}")
            if g.next_step_hint:
                lines.append(f"  后续操作提示:")
                for step in g.next_step_hint.split("\n"):
                    lines.append(f"    {step}")
            lines.append("")
            lines.append("-" * 80)

        lines.append("")
        lines.append("=" * 80)
        lines.append("【输出文件清单】")
        lines.append("  CSV明细（含所有原始记录与归并关系）: output/口袋公园座椅点位归并明细_*.csv")
        lines.append("  CSV归并组（含归并证据与处理提示）:   output/口袋公园座椅点位归并组_*.csv")
        lines.append("  CSV原始记录（含脏数据原样保留）:     output/口袋公园座椅点位原始记录_*.csv")
        lines.append("  JSON完整数据:                          output/口袋公园座椅点位归并完整数据_*.json")
        lines.append("=" * 80)
        return "\n".join(lines)

    def save_text_output(self, filename: str, content: str) -> str:
        file_path = self.output_dir / filename
        with open(file_path, mode='w', encoding='utf-8') as f:
            f.write(content)
        return str(file_path)
