from typing import List, Dict
from tabulate import tabulate
import json

from models import (
    VerificationResult,
    Issue,
    IssueType,
    IssueSeverity,
)


class ReportGenerator:
    SEVERITY_COLORS = {
        IssueSeverity.CRITICAL: "\033[91m",
        IssueSeverity.WARNING: "\033[93m",
        IssueSeverity.INFO: "\033[94m",
    }
    RESET_COLOR = "\033[0m"

    def __init__(self, results: List[VerificationResult]):
        self.results = results
        self.all_issues = []
        for result in results:
            self.all_issues.extend(result.issues)

    def _get_severity_marker(self, severity: IssueSeverity) -> str:
        markers = {
            IssueSeverity.CRITICAL: "[!]",
            IssueSeverity.WARNING: "[~]",
            IssueSeverity.INFO: "[i]",
        }
        return markers.get(severity, "[?]")

    def _get_issue_type_icon(self, issue_type: IssueType) -> str:
        icons = {
            IssueType.PRICE_EXPIRED: "⏰",
            IssueType.CONTAINER_CHANGED: "📦",
            IssueType.BAF_ADJUSTMENT: "⛽",
            IssueType.QUOTE_VERSION_MISMATCH: "📝",
            IssueType.OTHER: "❓",
        }
        return icons.get(issue_type, "❓")

    def generate_issue_summary(self) -> str:
        output = []
        output.append("=" * 80)
        output.append("海运运价锁价核验 - 问题清单")
        output.append("=" * 80)
        output.append("")

        total_issues = len(self.all_issues)
        critical_count = sum(1 for i in self.all_issues if i.severity == IssueSeverity.CRITICAL)
        warning_count = sum(1 for i in self.all_issues if i.severity == IssueSeverity.WARNING)
        info_count = sum(1 for i in self.all_issues if i.severity == IssueSeverity.INFO)

        output.append(f"统计汇总:")
        output.append(f"  严重问题: {critical_count}")
        output.append(f"  警告问题: {warning_count}")
        output.append(f"  提示信息: {info_count}")
        output.append(f"  总计: {total_issues}")
        output.append("")

        if total_issues == 0:
            output.append("✓ 未发现任何问题，所有订舱与锁价协议一致")
            return "\n".join(output)

        output.append("-" * 80)
        output.append("问题详情:")
        output.append("-" * 80)
        output.append("")

        issues_by_type = {}
        for issue in self.all_issues:
            if issue.issue_type not in issues_by_type:
                issues_by_type[issue.issue_type] = []
            issues_by_type[issue.issue_type].append(issue)

        for issue_type, issues in sorted(issues_by_type.items(), key=lambda x: x[0].value):
            icon = self._get_issue_type_icon(issue_type)
            output.append(f"{icon} {issue_type.value} ({len(issues)}项):")
            output.append("")
            
            for issue in issues:
                marker = self._get_severity_marker(issue.severity)
                output.append(f"  {marker} 订舱号: {issue.booking_no}")
                output.append(f"     标题: {issue.title}")
                output.append(f"     描述: {issue.description}")
                if issue.amount_diff is not None:
                    output.append(f"     金额差异: {issue.amount_diff:+.2f} {issue.currency}")
                output.append(f"     来源: {', '.join(issue.source_records)}")
                output.append("")

        return "\n".join(output)

    def generate_detailed_report(self) -> str:
        output = []
        output.append("=" * 100)
        output.append("海运运价锁价核验 - 详细报告")
        output.append("=" * 100)
        output.append("")

        for result in sorted(self.results, key=lambda x: x.booking_no):
            booking = self._get_booking_info(result.booking_no)
            agreement = self._get_agreement_info(result.agreement_id)

            output.append(f"订舱号: {result.booking_no}")
            output.append(f"关联协议: {result.agreement_id}")
            output.append(f"箱型: {result.container_type.value}")
            output.append(f"报价版本: {result.quote_version}")
            output.append("")

            output.append("  费用对比:")
            output.append(f"    预期基本运费: {result.expected_base_rate:.2f} USD")
            output.append(f"    实际基本运费: {result.actual_base_rate:.2f} USD")
            output.append(f"    基本运费差异: {result.base_rate_diff:+.2f} USD")
            output.append("")
            output.append(f"    预期燃油费: {result.expected_baf_rate:.2f} USD")
            output.append(f"    实际燃油费: {result.actual_baf_rate:.2f} USD")
            output.append(f"    燃油费差异: {result.baf_diff:+.2f} USD")
            output.append("")
            output.append(f"    总差异: {result.total_diff:+.2f} USD")
            output.append("")

            if result.issues:
                output.append("  发现问题:")
                for issue in result.issues:
                    icon = self._get_issue_type_icon(issue.issue_type)
                    marker = self._get_severity_marker(issue.severity)
                    output.append(f"    {icon} {marker} [{issue.issue_type.value}] {issue.title}")
                    output.append(f"       {issue.description}")
                    if issue.amount_diff is not None:
                        output.append(f"       金额影响: {issue.amount_diff:+.2f} {issue.currency}")
                    output.append(f"       数据来源: {', '.join(issue.source_records)}")
                    
                    if issue.details:
                        output.append(f"       详细信息:")
                        for key, value in issue.details.items():
                            if isinstance(value, list) and value:
                                output.append(f"         {key}:")
                                for item in value:
                                    output.append(f"           - {item}")
                            else:
                                output.append(f"         {key}: {value}")
                    output.append("")
            else:
                output.append("  ✓ 核验通过，无异常")
                output.append("")

            if "rate_adjustments" in result.audit_trail and result.audit_trail["rate_adjustments"]:
                output.append("  费率调整记录:")
                for adj in result.audit_trail["rate_adjustments"]:
                    rate_type = "基本运费" if adj["type"] == "base_rate" else "燃油费"
                    output.append(f"    {adj['date']}: {rate_type} {adj['old']:.2f} → {adj['new']:.2f}")
                    if adj["reason"]:
                        output.append(f"      原因: {adj['reason']}")
                    output.append(f"      改单编号: {adj['amendment_id']}")
                output.append("")

            if "version_changes" in result.audit_trail and result.audit_trail["version_changes"]:
                output.append("  版本变更记录:")
                for vc in result.audit_trail["version_changes"]:
                    output.append(f"    {vc['date']}: {vc['old_version']} → {vc['new_version']}")
                    if vc["reason"]:
                        output.append(f"      原因: {vc['reason']}")
                    output.append(f"      改单编号: {vc['amendment_id']}")
                output.append("")

            output.append("-" * 100)
            output.append("")

        return "\n".join(output)

    def generate_tabular_summary(self) -> str:
        headers = [
            "订舱号",
            "协议号",
            "箱型",
            "状态",
            "严重问题",
            "警告问题",
            "提示信息",
            "总差异(USD)",
        ]

        rows = []
        for result in self.results:
            critical = sum(1 for i in result.issues if i.severity == IssueSeverity.CRITICAL)
            warning = sum(1 for i in result.issues if i.severity == IssueSeverity.WARNING)
            info = sum(1 for i in result.issues if i.severity == IssueSeverity.INFO)
            
            status = "✓ 通过" if result.is_match else "✗ 异常"
            
            rows.append([
                result.booking_no,
                result.agreement_id,
                result.container_type.value,
                status,
                critical,
                warning,
                info,
                f"{result.total_diff:+.2f}",
            ])

        output = []
        output.append("=" * 100)
        output.append("海运运价锁价核验 - 汇总表")
        output.append("=" * 100)
        output.append("")
        output.append(tabulate(rows, headers=headers, tablefmt="grid"))
        output.append("")
        
        return "\n".join(output)

    def _get_booking_info(self, booking_no: str) -> Dict:
        from data_import import DataStore
        return {}

    def _get_agreement_info(self, agreement_id: str) -> Dict:
        from data_import import DataStore
        return {}

    def export_to_json(self, file_path: str):
        export_data = {
            "summary": {
                "total_bookings": len(self.results),
                "matched_bookings": sum(1 for r in self.results if r.is_match),
                "discrepant_bookings": sum(1 for r in self.results if not r.is_match),
                "total_issues": len(self.all_issues),
                "critical_issues": sum(1 for i in self.all_issues if i.severity == IssueSeverity.CRITICAL),
                "warning_issues": sum(1 for i in self.all_issues if i.severity == IssueSeverity.WARNING),
                "info_issues": sum(1 for i in self.all_issues if i.severity == IssueSeverity.INFO),
                "total_discrepancy_amount": sum(r.total_diff for r in self.results),
            },
            "issues": [
                {
                    "issue_id": issue.issue_id,
                    "issue_type": issue.issue_type.value,
                    "severity": issue.severity.value,
                    "booking_no": issue.booking_no,
                    "title": issue.title,
                    "description": issue.description,
                    "source_records": issue.source_records,
                    "amount_diff": issue.amount_diff,
                    "currency": issue.currency,
                    "details": issue.details,
                }
                for issue in self.all_issues
            ],
            "verification_results": [
                {
                    "booking_no": result.booking_no,
                    "agreement_id": result.agreement_id,
                    "is_match": result.is_match,
                    "issue_count": len(result.issues),
                    "expected_base_rate": result.expected_base_rate,
                    "expected_baf_rate": result.expected_baf_rate,
                    "actual_base_rate": result.actual_base_rate,
                    "actual_baf_rate": result.actual_baf_rate,
                    "base_rate_diff": result.base_rate_diff,
                    "baf_diff": result.baf_diff,
                    "total_diff": result.total_diff,
                    "quote_version": result.quote_version,
                    "container_type": result.container_type.value,
                    "audit_trail": result.audit_trail,
                }
                for result in self.results
            ],
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
