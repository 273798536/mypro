from datetime import datetime
from typing import List, Optional

from .models import (
    SampleRecord, ReviewMetric, FilterCriteria,
    ReportConfig, VersionDiff, ChangeItem, ReviewStatus
)


class MarkdownReportGenerator:
    """Markdown报告生成器 - 导出与屏幕一致，带筛选口径，可追溯"""

    def generate_report(
        self,
        samples: List[SampleRecord],
        metric: ReviewMetric,
        criteria: Optional[FilterCriteria] = None,
        config: Optional[ReportConfig] = None,
        version_diff: Optional[VersionDiff] = None,
        influential_samples: Optional[List[SampleRecord]] = None
    ) -> str:
        """生成Markdown格式的审查报告"""
        if config is None:
            config = ReportConfig()

        lines = []

        lines.append(f"# {config.title}")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        if config.include_filter_criteria and criteria:
            lines.append("## 筛选口径")
            lines.append("")
            lines.append(self._format_filter_criteria(criteria))
            lines.append("")

        lines.append("## 总体指标")
        lines.append("")
        lines.append(self._format_metric_table(metric))
        lines.append("")

        if influential_samples:
            lines.append("## 影响结论的关键样本")
            lines.append("")
            lines.append("以下样本对整体结论影响较大，评审时建议重点关注：")
            lines.append("")
            for i, s in enumerate(influential_samples[:10], 1):
                reasons = []
                if s.status == ReviewStatus.FAIL:
                    reasons.append("未通过")
                if s.missing_references:
                    reasons.append(f"缺{len(s.missing_references)}项引用")
                if s.is_duplicate:
                    reasons.append("重复评测")
                reasons_str = "、".join(reasons) if reasons else "待确认"
                lines.append(f"{i}. **{s.sample_name}** - {reasons_str}")
            lines.append("")

        if version_diff and config.include_version_diff and version_diff.changes:
            lines.append("## 版本变更记录")
            lines.append("")
            lines.append(f"**对比版本**: {version_diff.old_version} → {version_diff.new_version}")
            lines.append("")
            lines.append(f"**变更样本数**: {len(version_diff.changed_samples)}")
            lines.append("")
            lines.append("### 变更明细")
            lines.append("")
            lines.append("| 样本 | 字段 | 变更类型 | 原值 | 新值 |")
            lines.append("|------|------|----------|------|------|")
            for change in version_diff.changes[:20]:
                sample_id = change.sample_id or "-"
                old_val = change.old_value.replace('|', '\\|') if change.old_value else "-"
                new_val = change.new_value.replace('|', '\\|') if change.new_value else "-"
                lines.append(f"| {sample_id} | {change.field} | {self._cn_change_type(change.change_type)} | {old_val} | {new_val} |")
            lines.append("")

        if config.include_details:
            lines.append("## 样本明细")
            lines.append("")
            lines.append("| 样本 | 版本 | 状态 | 引用数 | 缺失引用 | 重复评测 |")
            lines.append("|------|------|------|--------|----------|----------|")
            for s in samples:
                status_cn = self._cn_status(s.status)
                missing_refs = "、".join(s.missing_references) if s.missing_references else "无"
                dup = "是" if s.is_duplicate else "否"
                lines.append(f"| {s.sample_name} | {s.review_version} | {status_cn} | {len(s.references)} | {missing_refs} | {dup} |")
            lines.append("")

            lines.append("### 各样本详情")
            lines.append("")
            for s in samples:
                lines.append(f"#### {s.sample_name}")
                lines.append("")
                lines.append(f"- **版本**: {s.review_version}")
                lines.append(f"- **状态**: {self._cn_status(s.status)}")
                lines.append(f"- **分类**: {s.category or '未分类'}")
                lines.append(f"- **来源**: {self._cn_source_type(s.source_type)}")
                lines.append(f"- **引用数**: {len(s.references)}")
                if s.missing_references:
                    lines.append(f"- **缺失引用**: {', '.join(s.missing_references)}")
                if s.is_duplicate:
                    lines.append(f"- **重复对象**: {s.duplicate_of or '未明确'}")
                lines.append("")

        lines.append("---")
        lines.append("*本报告由代码审查指标看板自动生成，数据与看板屏幕显示一致*")

        return "\n".join(lines)

    def generate_simple_report(
        self,
        metric: ReviewMetric,
        criteria: Optional[FilterCriteria] = None
    ) -> str:
        """生成简洁版报告"""
        lines = []

        lines.append("# 代码审查指标报告")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        if criteria:
            lines.append("## 筛选口径")
            lines.append("")
            lines.append(self._format_filter_criteria(criteria))
            lines.append("")

        lines.append("## 核心指标")
        lines.append("")
        lines.append(f"- **总样本数**: {metric.total_samples}")
        lines.append(f"- **通过率**: {metric.pass_rate}% ({metric.pass_count}/{metric.total_samples})")
        lines.append(f"- **缺引用样本**: {metric.missing_ref_count} ({metric.missing_ref_rate}%)")
        lines.append(f"- **重复评测**: {metric.duplicate_count}")
        lines.append("")

        return "\n".join(lines)

    def _format_filter_criteria(self, criteria: FilterCriteria) -> str:
        """格式化筛选口径"""
        items = []

        if criteria.versions:
            items.append(f"- **版本**: {', '.join(criteria.versions)}")
        if criteria.categories:
            items.append(f"- **分类**: {', '.join(criteria.categories)}")
        if criteria.statuses:
            statuses_cn = [self._cn_status(s) for s in criteria.statuses]
            items.append(f"- **状态**: {', '.join(statuses_cn)}")
        if criteria.source_types:
            sources_cn = [self._cn_source_type(s) for s in criteria.source_types]
            items.append(f"- **来源**: {', '.join(sources_cn)}")
        if criteria.has_missing_refs is not None:
            items.append(f"- **有缺失引用**: {'是' if criteria.has_missing_refs else '否'}")
        if criteria.is_duplicate is not None:
            items.append(f"- **重复评测**: {'是' if criteria.is_duplicate else '否'}")

        if not items:
            return "无筛选条件（全部数据）"

        return "\n".join(items)

    def _format_metric_table(self, metric: ReviewMetric) -> str:
        """格式化指标表格"""
        lines = []
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| 总样本数 | {metric.total_samples} |")
        lines.append(f"| 通过数 | {metric.pass_count} |")
        lines.append(f"| 未通过数 | {metric.fail_count} |")
        lines.append(f"| 待处理数 | {metric.pending_count} |")
        lines.append(f"| 通过率 | {metric.pass_rate}% |")
        lines.append(f"| 缺引用样本数 | {metric.missing_ref_count} |")
        lines.append(f"| 缺引用率 | {metric.missing_ref_rate}% |")
        lines.append(f"| 重复评测数 | {metric.duplicate_count} |")
        lines.append(f"| 平均引用数 | {metric.avg_refs_per_sample} |")
        return "\n".join(lines)

    def _cn_status(self, status: ReviewStatus) -> str:
        mapping = {
            ReviewStatus.PASS: "通过",
            ReviewStatus.FAIL: "未通过",
            ReviewStatus.PENDING: "待处理",
            ReviewStatus.DUPLICATE: "重复",
        }
        return mapping.get(status, status.value)

    def _cn_source_type(self, source) -> str:
        from .models import SourceType
        mapping = {
            SourceType.VERSION_NOTE: "版本说明",
            SourceType.REVIEW_RECORD: "审查记录",
            SourceType.ORAL_NOTE: "口头说明",
        }
        return mapping.get(source, str(source))

    def _cn_change_type(self, change_type: str) -> str:
        mapping = {
            "added": "新增",
            "removed": "删除",
            "modified": "修改",
        }
        return mapping.get(change_type, change_type)


report_generator = MarkdownReportGenerator()
