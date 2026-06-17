"""报告导出模块 - 面向训练组，只讲哪些记录不能用，为什么不能用."""

from typing import List, Optional
import json
import os
import csv
import io
from datetime import datetime

from .models import WorkflowReport, LeakRecord, DedupRecord, GroupMetrics, QASample


class ReportExporter:
    """训练组专用报告导出器.

    设计原则：
    - 训练组只关心哪些记录不能用，不关心系统菜单
    - 训练验证泄漏要有普通话解释，产品经理可直接复制
    - 人工备注原话保留，不自动改成整齐的句子
    - 只看导出报告就能明白为什么被拦下来
    """

    def __init__(self, report: WorkflowReport):
        self.report = report

    def _format_leak_record(self, record: LeakRecord, idx: int) -> str:
        lines = [
            f"=== 训练验证泄漏 #{idx} ===",
            f"严重级别：{record.severity.value}（必须处理）",
            f"相似度：{int(record.similarity_score * 100)}%",
            f"匹配字段：{', '.join(record.matched_fields) if record.matched_fields else '内容'}",
            f"",
            f"训练集样本 ID：{record.train_sample_id}",
            f"训练集问题摘要：{record.train_question_preview}",
            f"",
            f"验证集样本 ID：{record.val_sample_id}",
            f"验证集问题摘要：{record.val_question_preview}",
            f"",
            f"拦截原因（技术描述）：{record.leak_reason}",
            f"",
            f"拦截原因（普通话解释，可直接复制给同事）：",
            f"--- 开始复制 ---",
            record.plain_text_explanation,
            f"--- 结束复制 ---",
        ]
        if record.preserved_human_notes:
            lines.append("")
            lines.append("相关人工备注（原话保留，未做任何改写）：")
            for i, note in enumerate(record.preserved_human_notes, 1):
                lines.append(f"  备注 {i}：{note}")
        lines.append("")
        lines.append(f"处理建议：上述两条样本二选一即可，不要同时出现在训练集和验证集。")
        return "\n".join(lines)

    def _format_dedup_record(self, record: DedupRecord, idx: int) -> str:
        inc_tag = " [增量检测]" if record.is_incremental else ""
        lines = [
            f"=== 重复样本 #{idx}{inc_tag} ===",
            f"严重级别：{record.severity.value}",
            f"相似度：{int(record.similarity_score * 100)}%",
            f"",
            f"保留样本 ID：{record.kept_sample_id}",
            f"保留样本问题摘要：{record.kept_question_preview}",
            f"",
            f"移除样本 ID：{record.removed_sample_id}",
            f"移除样本问题摘要：{record.removed_question_preview}",
            f"",
            f"去重原因：{record.dedup_reason}",
        ]
        return "\n".join(lines)

    def _format_group_metrics(self, gm: GroupMetrics) -> str:
        blocked_reasons = []
        if gm.leak_count > 0:
            blocked_reasons.append(f"泄漏 {gm.leak_count}")
        if gm.duplicate_count > 0:
            blocked_reasons.append(f"重复 {gm.duplicate_count}")
        if gm.template_count > 0:
            blocked_reasons.append(f"模板化 {gm.template_count}")
        blocked_desc = "、".join(blocked_reasons) if blocked_reasons else "无"
        return (
            f"[{gm.group_name}] 共 {gm.total_samples} 条，"
            f"可用 {gm.usable_samples} 条，不可用 {gm.blocked_samples} 条 "
            f"（{blocked_desc}）；训练集 {gm.train_count} 条，验证集 {gm.val_count} 条"
        )

    def _build_overview_section(self) -> List[str]:
        report = self.report
        lines = []
        if report.is_incremental:
            lines += [
                "-" * 40,
                "一、总览（训练组先看这里：本次补录哪些能用、哪些不能用）",
                "-" * 40,
                "【本次新增补录】",
                f"新增样本数：{report.total_processed} 条",
                f"新增可用：{report.total_usable} 条（可以直接加入训练/验证集）",
                f"新增拦截：{report.total_blocked} 条（不能用，原因见下方详情）",
                f"  - 新增训练验证泄漏：{len(report.leak_records)} 条",
                f"  - 新增重复样本：{len(report.dedup_records)} 条",
                f"  - 本次模板化清理（仍可用，内容已优化）：{report.template_removed_count} 条",
                "",
                "【累计情况】",
                f"累计样本总数：{report.cumulative_total} 条",
                f"累计可用：{report.cumulative_usable} 条",
                f"累计拦截：{report.cumulative_blocked} 条",
                "",
                "本次新增可用样本 ID：",
                ", ".join(report.newly_usable_ids) if report.newly_usable_ids else "（无）",
                "",
                "本次新增拦截样本 ID（这些不能用）：",
                ", ".join(report.newly_blocked_ids) if report.newly_blocked_ids else "（无）",
                "",
                "全部累计拦截样本 ID：",
                ", ".join(report.blocked_sample_ids) if report.blocked_sample_ids else "（无）",
            ]
        else:
            lines += [
                "-" * 40,
                "一、总览（训练组只需要看这里就知道哪些能用）",
                "-" * 40,
                f"本次处理样本总数：{report.total_processed}",
                f"可用样本数：{report.total_usable} 条（可以直接拿去训练）",
                f"拦截样本数：{report.total_blocked} 条（不能用，原因见下方）",
                f"  - 因训练验证泄漏拦截：{len(report.leak_records)} 条",
                f"  - 因重复样本拦截：{len(report.dedup_records)} 条",
                f"  - 去模板化清理（仍可用，内容已优化）：{report.template_removed_count} 条",
                "",
                "可用样本 ID 列表：",
                ", ".join(report.usable_sample_ids) if report.usable_sample_ids else "（无）",
                "",
                "拦截样本 ID 列表（这些不能用）：",
                ", ".join(report.blocked_sample_ids) if report.blocked_sample_ids else "（无）",
            ]
        lines.append("")
        return lines

    def export_text_report(self) -> str:
        report = self.report
        title = (
            "问答样本去模板化 - 训练组专用报告（增量补录版）"
            if report.is_incremental
            else "问答样本去模板化 - 训练组专用报告"
        )
        lines = [
            "=" * 60,
            title,
            "=" * 60,
            f"报告版本：{report.version_tag}",
            f"报告类型：{'增量补录报告' if report.is_incremental else '全量报告'}",
            f"生成时间：{report.generated_at}",
            f"报告 ID：{report.report_id}",
            "",
        ]
        lines += self._build_overview_section()
        if report.group_metrics:
            group_title = "二、本次补录分组明细" if report.is_incremental else "二、分组明细"
            lines += [
                "-" * 40,
                group_title,
                "-" * 40,
            ]
            for gm in report.group_metrics:
                lines.append(self._format_group_metrics(gm))
            lines.append("")
        if report.leak_records:
            leak_title = (
                "三、本次新增训练验证泄漏详情（必须看，这些是真正的风险点）"
                if report.is_incremental
                else "三、训练验证泄漏详情（必须看，这些是真正的风险点）"
            )
            lines += [
                "-" * 40,
                leak_title,
                "-" * 40,
                "说明：每条泄漏记录下方都有一段普通话解释，产品经理可直接复制给同事。",
                "人工备注原话保留，未做任何自动改写。",
                "",
            ]
            for i, lr in enumerate(report.leak_records, 1):
                lines.append(self._format_leak_record(lr, i))
                lines.append("")
        if report.dedup_records:
            dedup_title = (
                "四、本次新增重复样本详情"
                if report.is_incremental
                else "四、重复样本详情"
            )
            lines += [
                "-" * 40,
                dedup_title,
                "-" * 40,
            ]
            for i, dr in enumerate(report.dedup_records, 1):
                lines.append(self._format_dedup_record(dr, i))
                lines.append("")
        summary_title = "五、系统导出摘要"
        lines += [
            "-" * 40,
            summary_title,
            "-" * 40,
            report.export_summary,
            "",
            "=" * 60,
            "报告结束",
            "=" * 60,
        ]
        return "\n".join(lines)

    def export_json(self, indent: int = 2) -> str:
        return self.report.to_json(indent=indent, ensure_ascii=False)

    def _build_blocked_rows(self, mode: str = "auto") -> List[List[str]]:
        rows = []
        report = self.report
        if report.is_incremental and mode == "cumulative":
            reason_map = {}
            for sid in report.blocked_sample_ids:
                reason_map[sid] = {"reasons": [], "max_sev": "warning"}
            for lr in report.cumulative_leak_records:
                if lr.val_sample_id in reason_map:
                    reason_map[lr.val_sample_id]["reasons"].append("训练验证泄漏")
                    if lr.severity.value == "blocker":
                        reason_map[lr.val_sample_id]["max_sev"] = "blocker"
            for dr in report.cumulative_dedup_records:
                if dr.removed_sample_id in reason_map:
                    reason_map[dr.removed_sample_id]["reasons"].append("重复样本")
            for sid, info in reason_map.items():
                r = "；".join(info["reasons"]) if info["reasons"] else "其他原因"
                rows.append([sid, r, info["max_sev"]])
            return rows
        if report.is_incremental and mode in ("auto", "incremental"):
            for lr in report.leak_records:
                if lr.val_sample_id in set(report.newly_blocked_ids):
                    rows.append([lr.val_sample_id, "训练验证泄漏", lr.severity.value])
            for dr in report.dedup_records:
                if dr.removed_sample_id in set(report.newly_blocked_ids):
                    rows.append([dr.removed_sample_id, "重复样本", dr.severity.value])
            for sid in report.newly_blocked_ids:
                found = any(r[0] == sid for r in rows)
                if not found:
                    rows.append([sid, "其他原因拦截", "warning"])
            return rows
        for lr in report.leak_records:
            rows.append([lr.val_sample_id, "训练验证泄漏", lr.severity.value])
        for dr in report.dedup_records:
            rows.append([dr.removed_sample_id, "重复样本", dr.severity.value])
        return rows

    def _write_csv(self, path: str, header: List[str], rows: List[List[str]]):
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(rows)

    def _build_usable_rows(self, mode: str = "auto") -> List[List[str]]:
        report = self.report
        ids = report.newly_usable_ids if (report.is_incremental and mode in ("auto", "incremental")) else report.usable_sample_ids
        rows = []
        return [[sid] for sid in ids]

    def export_csv_files(self, output_dir: str, filename_prefix: str) -> dict:
        os.makedirs(output_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        result = {}
        report = self.report
        if report.is_incremental:
            inc_blocked_path = os.path.join(output_dir, f"{filename_prefix}_blocked_incremental_{ts}.csv")
            self._write_csv(inc_blocked_path,
                           ["sample_id", "block_reason", "severity"],
                           self._build_blocked_rows("incremental"))
            result["blocked_incremental_csv"] = inc_blocked_path

            cum_blocked_path = os.path.join(output_dir, f"{filename_prefix}_blocked_cumulative_{ts}.csv")
            self._write_csv(cum_blocked_path,
                           ["sample_id", "block_reason", "severity"],
                           self._build_blocked_rows("cumulative"))
            result["blocked_cumulative_csv"] = cum_blocked_path

            inc_usable_path = os.path.join(output_dir, f"{filename_prefix}_usable_incremental_{ts}.csv")
            self._write_csv(inc_usable_path, ["sample_id"], self._build_usable_rows("incremental"))
            result["usable_incremental_csv"] = inc_usable_path

            cum_usable_path = os.path.join(output_dir, f"{filename_prefix}_usable_cumulative_{ts}.csv")
            self._write_csv(cum_usable_path, ["sample_id"], self._build_usable_rows("cumulative"))
            result["usable_cumulative_csv"] = cum_usable_path
        else:
            blocked_path = os.path.join(output_dir, f"{filename_prefix}_blocked_{ts}.csv")
            self._write_csv(blocked_path,
                           ["sample_id", "block_reason", "severity"],
                           self._build_blocked_rows("full"))
            result["blocked_csv"] = blocked_path

            usable_path = os.path.join(output_dir, f"{filename_prefix}_usable_{ts}.csv")
            self._write_csv(usable_path, ["sample_id"], self._build_usable_rows("full"))
            result["usable_csv"] = usable_path
        return result

    def export_for_training_team(
        self,
        output_dir: str,
        filename_prefix: Optional[str] = None,
    ) -> dict:
        os.makedirs(output_dir, exist_ok=True)
        prefix = filename_prefix or f"qa_report_{self.report.version_tag}"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        text_path = os.path.join(output_dir, f"{prefix}_{ts}.txt")
        json_path = os.path.join(output_dir, f"{prefix}_{ts}.json")
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(self.export_text_report())
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(self.export_json())
        result = {
            "text_report": text_path,
            "json_report": json_path,
        }
        result.update(self.export_csv_files(output_dir, prefix))
        return result
