import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

from .models import (
    ScoreProject,
    Issue,
    IssueStatus,
    IssueCategory,
    IssueSeverity,
)


class ReportGenerator:
    def __init__(self, project: ScoreProject):
        self.project = project

    def generate_full_report(self, output_dir: str, format: str = "json") -> str:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_filename = f"score_report_{timestamp}"

        if format == "json":
            file_path = os.path.join(output_dir, f"{base_filename}.json")
            self._generate_json_report(file_path)
        elif format == "text":
            file_path = os.path.join(output_dir, f"{base_filename}.txt")
            self._generate_text_report(file_path)
        elif format == "markdown":
            file_path = os.path.join(output_dir, f"{base_filename}.md")
            self._generate_markdown_report(file_path)
        else:
            raise ValueError(f"不支持的报告格式: {format}")

        return file_path

    def generate_issue_list(self, output_dir: str, status_filter: Optional[IssueStatus] = None) -> str:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        issues = self.project.issues
        if status_filter:
            issues = [i for i in issues if i.status == status_filter]

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"issue_list_{status_filter.value if status_filter else 'all'}_{timestamp}.json"
        file_path = os.path.join(output_dir, filename)

        issue_data = {
            "project_id": self.project.id,
            "project_name": self.project.name,
            "generated_at": datetime.now().isoformat(),
            "filter_status": status_filter.value if status_filter else None,
            "total_issues": len(issues),
            "issues": [
                {
                    "id": issue.id,
                    "category": issue.category.value,
                    "severity": issue.severity.value,
                    "status": issue.status.value,
                    "measure_number": issue.measure_number,
                    "description": issue.description,
                    "evidence": [e.model_dump(mode="json") for e in issue.evidence],
                    "suggestions": issue.suggestions,
                    "has_corrections": len(issue.corrections) > 0,
                    "corrections_count": len(issue.corrections),
                }
                for issue in issues
            ],
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(issue_data, f, ensure_ascii=False, indent=2)

        return file_path

    def generate_pending_issues_report(self, output_dir: str) -> str:
        return self.generate_issue_list(output_dir, IssueStatus.PENDING)

    def generate_summary(self) -> Dict[str, Any]:
        issues = self.project.issues

        summary = {
            "project": {
                "id": self.project.id,
                "name": self.project.name,
                "created_at": self.project.created_at.isoformat(),
                "current_version": self.project.current_version,
                "import_sources_count": len(self.project.import_sources),
            },
            "measures": {
                "total": len(self.project.measures),
                "complete": sum(1 for m in self.project.measures if m.is_complete),
            },
            "issues": {
                "total": len(issues),
                "by_status": self._count_by_status(issues),
                "by_category": self._count_by_category(issues),
                "by_severity": self._count_by_severity(issues),
            },
            "corrections": {
                "total_corrections": sum(len(i.corrections) for i in issues),
                "resolved_issues": sum(1 for i in issues if i.status == IssueStatus.RESOLVED),
            },
        }

        return summary

    def print_console_summary(self):
        summary = self.generate_summary()

        print("\n" + "=" * 60)
        print("  乐谱校对报告 - {}".format(summary["project"]["name"]))
        print("=" * 60)
        print(f"项目ID: {summary['project']['id']}")
        print(f"当前版本: v{summary['project']['current_version']}")
        print(f"导入源: {summary['project']['import_sources_count']} 个")
        print()
        print(f"小节总数: {summary['measures']['total']}")
        print(f"  完整小节: {summary['measures']['complete']}")
        print()
        print("问题统计:")
        print(f"  总计: {summary['issues']['total']}")
        for status, count in summary["issues"]["by_status"].items():
            print(f"    {status}: {count}")
        print()
        print("按类别:")
        for category, count in summary["issues"]["by_category"].items():
            print(f"    {category}: {count}")
        print()
        print("按严重程度:")
        for severity, count in summary["issues"]["by_severity"].items():
            print(f"    {severity}: {count}")
        print()
        print(f"已修正: {summary['corrections']['resolved_issues']} 个问题")
        print(f"修正次数: {summary['corrections']['total_corrections']}")
        print("=" * 60 + "\n")

    def print_issue_details(self, issue_id: Optional[str] = None):
        if issue_id:
            issues = [i for i in self.project.issues if i.id == issue_id]
            if not issues:
                print(f"未找到问题: {issue_id}")
                return
            self._print_single_issue(issues[0])
        else:
            for issue in self.project.issues:
                self._print_single_issue(issue)
                print("-" * 60)

    def _print_single_issue(self, issue: Issue):
        print(f"\n【问题ID: {issue.id}")
        print(f"类别: {self._get_category_display(issue.category)}")
        print(f"严重程度: {self._get_severity_display(issue.severity)}")
        print(f"状态: {self._get_status_display(issue.status)}")
        print(f"位置: 第{issue.measure_number}小节" if issue.measure_number else "位置: 未知")
        print(f"描述: {issue.description}")
        print()
        print("证据:")
        for ev in issue.evidence:
            print(f"  - [{ev.source}] {ev.description}")
        print()
        print("建议:")
        for sug in issue.suggestions:
            print(f"  - {sug}")
        print()
        if issue.corrections:
            print("修正历史:")
            for corr in issue.corrections:
                print(f"  - {corr.corrected_by} @ {corr.corrected_at.strftime('%Y-%m-%d %H:%M')}")
                print(f"    描述: {corr.description}")
                print(f"    变更: {corr.original_value} -> {corr.corrected_value}")

    def _generate_json_report(self, file_path: str):
        report_data = {
            "summary": self.generate_summary(),
            "issues": [i.model_dump(mode="json") for i in self.project.issues],
            "version_history": [v.model_dump(mode="json") for v in self.project.version_history],
            "import_sources": [s.model_dump(mode="json") for s in self.project.import_sources],
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

    def _generate_text_report(self, file_path: str):
        lines = []
        summary = self.generate_summary()

        lines.append("=" * 60)
        lines.append(f"乐谱校对报告 - {summary['project']['name']}")
        lines.append("=" * 60)
        lines.append("")

        lines.append("一、项目概览")
        lines.append(f"  项目名称: {summary['project']['name']}")
        lines.append(f"  项目ID: {summary['project']['id']}")
        lines.append(f"  创建时间: {summary['project']['created_at']}")
        lines.append(f"  当前版本: v{summary['project']['current_version']}")
        lines.append(f"  导入源数量: {summary['project']['import_sources_count']}")
        lines.append("")

        lines.append("二、小节统计")
        lines.append(f"  小节总数: {summary['measures']['total']}")
        lines.append(f"  完整小节: {summary['measures']['complete']}")
        lines.append("")

        lines.append("三、问题概览")
        lines.append(f"  问题总数: {summary['issues']['total']}")
        lines.append("")

        for status, count in summary['issues']['by_status'].items():
            lines.append(f"  {status}: {count}")
        lines.append("")

        lines.append("四、详细问题清单")
        lines.append("-" * 60)

        for issue in self.project.issues:
            lines.append(f"【问题ID: {issue.id}")
            lines.append(f"  类别: {self._get_category_display(issue.category)}")
            lines.append(f"  严重程度: {self._get_severity_display(issue.severity)}")
            lines.append(f"  状态: {self._get_status_display(issue.status)}")
            if issue.measure_number:
                lines.append(f"  小节: 第{issue.measure_number}小节")
            lines.append(f"  描述: {issue.description}")
            lines.append("")

            if issue.evidence:
                lines.append("  证据:")
                for ev in issue.evidence:
                    lines.append(f"    - [{ev.source}] {ev.description}")
                lines.append("")

            if issue.suggestions:
                lines.append("  处理建议:")
                for sug in issue.suggestions:
                    lines.append(f"    - {sug}")
                lines.append("")

            if issue.corrections:
                lines.append("  修正记录:")
                for corr in issue.corrections:
                    lines.append(f"    * {corr.corrected_by} @ {corr.corrected_at.strftime('%Y-%m-%d %H:%M')}")
                    lines.append(f"      描述: {corr.description}")
                    lines.append(f"      变更: {corr.original_value} -> {corr.corrected_value}")
                lines.append("")

            lines.append("-" * 60)
            lines.append("")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

    def _generate_markdown_report(self, file_path: str):
        lines = []
        summary = self.generate_summary()

        lines.append(f"# 乐谱校对报告")
        lines.append("")
        lines.append(f"## 项目信息")
        lines.append("")
        lines.append(f"- **项目名称**: {summary['project']['name']}")
        lines.append(f"- **项目ID**: {summary['project']['id']}")
        lines.append(f"- **创建时间**: {summary['project']['created_at']}")
        lines.append(f"- **当前版本**: v{summary['project']['current_version']}")
        lines.append(f"- **导入源**: {summary['project']['import_sources_count']} 个")
        lines.append("")

        lines.append("## 小节统计")
        lines.append("")
        lines.append(f"- **小节总数**: {summary['measures']['total']}")
        lines.append(f"- **完整小节**: {summary['measures']['complete']}")
        lines.append("")

        lines.append("## 问题统计")
        lines.append("")
        lines.append(f"- **问题总数**: {summary['issues']['total']}")
        lines.append("")
        lines.append("### 按状态")
        lines.append("")
        for status, count in summary['issues']['by_status'].items():
            lines.append(f"- {status}: {count}")
        lines.append("")
        lines.append("### 按类别")
        lines.append("")
        for category, count in summary['issues']['by_category'].items():
            lines.append(f"- {category}: {count}")
        lines.append("")
        lines.append("### 按严重程度")
        lines.append("")
        for severity, count in summary['issues']['by_severity'].items():
            lines.append(f"- {severity}: {count}")
        lines.append("")

        lines.append("## 问题详情")
        lines.append("")

        for issue in self.project.issues:
            lines.append(f"### {issue.description}")
            lines.append("")
            lines.append(f"- **ID**: `{issue.id}`")
            lines.append(f"- **类别**: {self._get_category_display(issue.category)}")
            lines.append(f"- **严重程度**: {self._get_severity_display(issue.severity)}")
            lines.append(f"- **状态**: {self._get_status_display(issue.status)}")
            if issue.measure_number:
                lines.append(f"- **位置**: 第{issue.measure_number}小节")
            lines.append("")

            if issue.evidence:
                lines.append("#### 证据")
                lines.append("")
                for ev in issue.evidence:
                    lines.append(f"- **[{ev.source}]** {ev.description}")
                lines.append("")

            if issue.suggestions:
                lines.append("#### 处理建议")
                lines.append("")
                for sug in issue.suggestions:
                    lines.append(f"- {sug}")
                lines.append("")

            if issue.corrections:
                lines.append("#### 修正记录")
                lines.append("")
                for corr in issue.corrections:
                    lines.append(f"**{corr.corrected_by}** @ {corr.corrected_at.strftime('%Y-%m-%d %H:%M')}")
                    lines.append("")
                    lines.append(f"- 描述: {corr.description}")
                    lines.append(f"- 变更: `{corr.original_value}` → `{corr.corrected_value}`")
                    lines.append("")

            lines.append("---")
            lines.append("")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

    def _count_by_status(self, issues: List[Issue]) -> Dict[str, int]:
        counts = defaultdict(int)
        for issue in issues:
            counts[self._get_status_display(issue.status)] += 1
        return dict(counts)

    def _count_by_category(self, issues: List[Issue]) -> Dict[str, int]:
        counts = defaultdict(int)
        for issue in issues:
            counts[self._get_category_display(issue.category)] += 1
        return dict(counts)

    def _count_by_severity(self, issues: List[Issue]) -> Dict[str, int]:
        counts = defaultdict(int)
        for issue in issues:
            counts[self._get_severity_display(issue.severity)] += 1
        return dict(counts)

    def _get_category_display(self, category: IssueCategory) -> str:
        displays = {
            IssueCategory.ACCIDENTAL_MISSING: "升降号漏识",
            IssueCategory.ACCIDENTAL_MISREAD: "升降号误识",
            IssueCategory.SLUR_BROKEN: "连音线断裂",
            IssueCategory.BARLINE_MISALIGNED: "小节错位",
            IssueCategory.NOTE_MISREAD: "音符误识",
            IssueCategory.RHYTHM_ERROR: "节奏错误",
        }
        return displays.get(category, category.value)

    def _get_severity_display(self, severity: IssueSeverity) -> str:
        displays = {
            IssueSeverity.INFO: "信息",
            IssueSeverity.WARNING: "警告",
            IssueSeverity.ERROR: "错误",
            IssueSeverity.CRITICAL: "严重",
        }
        return displays.get(severity, severity.value)

    def _get_status_display(self, status: IssueStatus) -> str:
        displays = {
            IssueStatus.PENDING: "待确认",
            IssueStatus.CONFIRMED: "已确认",
            IssueStatus.RESOLVED: "已解决",
            IssueStatus.DISMISSED: "已驳回",
        }
        return displays.get(status, status.value)
