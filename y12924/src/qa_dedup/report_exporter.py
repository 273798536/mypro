"""报告导出模块 - 面向训练组，只讲哪些记录不能用，为什么不能用."""

from typing import List, Optional
import json
import os
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

    def export_text_report(self) -> str:
        report = self.report
        lines = [
            "=" * 60,
            "问答样本去模板化 - 训练组专用报告",
            "=" * 60,
            f"报告版本：{report.version_tag}",
            f"生成时间：{report.generated_at}",
            f"报告 ID：{report.report_id}",
            "",
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
            "",
        ]
        if report.group_metrics:
            lines += [
                "-" * 40,
                "二、分组明细",
                "-" * 40,
            ]
            for gm in report.group_metrics:
                lines.append(self._format_group_metrics(gm))
            lines.append("")
        if report.leak_records:
            lines += [
                "-" * 40,
                "三、训练验证泄漏详情（必须看，这些是真正的风险点）",
                "-" * 40,
                "说明：每条泄漏记录下方都有一段普通话解释，产品经理可直接复制给同事。",
                "人工备注原话保留，未做任何自动改写。",
                "",
            ]
            for i, lr in enumerate(report.leak_records, 1):
                lines.append(self._format_leak_record(lr, i))
                lines.append("")
        if report.dedup_records:
            lines += [
                "-" * 40,
                "四、重复样本详情",
                "-" * 40,
            ]
            for i, dr in enumerate(report.dedup_records, 1):
                lines.append(self._format_dedup_record(dr, i))
                lines.append("")
        lines += [
            "-" * 40,
            "五、系统导出摘要",
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
        blocked_csv_path = os.path.join(output_dir, f"{prefix}_blocked_{ts}.csv")
        with open(blocked_csv_path, "w", encoding="utf-8") as f:
            f.write("sample_id,block_reason,severity\n")
            for lr in self.report.leak_records:
                f.write(f"{lr.val_sample_id},训练验证泄漏,{lr.severity.value}\n")
            for dr in self.report.dedup_records:
                f.write(f"{dr.removed_sample_id},重复样本,{dr.severity.value}\n")
        return {
            "text_report": text_path,
            "json_report": json_path,
            "blocked_csv": blocked_csv_path,
        }
