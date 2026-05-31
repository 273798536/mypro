from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

from models import (
    SettlementReport,
    SettlementDetail,
    DataIssue,
    ConflictType
)


class ReportGenerator:
    def __init__(self, output_dir: str = "./reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_text_report(self, report: SettlementReport) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append("                    音乐版权邻接权分账报告")
        lines.append("=" * 80)
        lines.append("")

        lines.append(f"报告批次: {report.batch_id}")
        lines.append(f"结算月份: {report.settlement_month}")
        lines.append(f"生成时间: {report.generated_at}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("一、结算汇总")
        lines.append("-" * 80)
        summary = report.summary
        lines.append(f"  分账曲目数: {summary['tracks_count']} 首")
        lines.append(f"  权属方数量: {summary['owners_count']} 家")
        lines.append(f"  平台数量: {summary['platforms_count']} 个")
        lines.append(f"  总分账金额: ¥{summary['total_settlement']:,.2f}")
        lines.append(f"  明细记录数: {summary['details_count']} 条")
        lines.append("")

        issues = summary['issues_summary']
        lines.append(f"  数据问题统计: 共 {issues['total']} 个问题")
        lines.append(f"    - 高优先级: {issues['high']} 个")
        lines.append(f"    - 中优先级: {issues['medium']} 个")
        lines.append(f"    - 低优先级: {issues['warning']} 个")
        if issues['by_type']:
            lines.append("    按类型分布:")
            for issue_type, count in issues['by_type'].items():
                lines.append(f"      * {issue_type}: {count} 个")
        lines.append("")

        supp = summary['supplementary_info']
        if supp['count'] > 0:
            lines.append(f"  补录数据: {supp['count']} 条，涉及金额 ¥{supp['amount']:,.2f}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("二、数据问题及处理建议")
        lines.append("-" * 80)
        if report.issues:
            for idx, issue in enumerate(report.issues, 1):
                severity_map = {'high': '高', 'medium': '中', 'warning': '低'}
                lines.append(f"  问题 {idx} [{severity_map.get(issue.severity, '未知')}优先级]")
                lines.append(f"    类型: {issue.conflict_type.value if issue.conflict_type else '未知'}")
                lines.append(f"    描述: {issue.description}")
                lines.append(f"    涉及金额: ¥{issue.affected_amount:,.2f}")
                lines.append(f"    建议: {issue.suggestion}")
                if issue.related_records:
                    lines.append(f"    关联记录: {', '.join(issue.related_records[:5])}")
                lines.append("")
        else:
            lines.append("  未发现数据问题")
        lines.append("")

        lines.append("-" * 80)
        lines.append("三、业务处理建议")
        lines.append("-" * 80)
        for idx, suggestion in enumerate(report.handling_suggestions, 1):
            lines.append(f"  {idx}. {suggestion}")
            lines.append("")

        if report.supplementary_impacts:
            lines.append("-" * 80)
            lines.append("四、补录数据影响明细")
            lines.append("-" * 80)
            for idx, impact in enumerate(report.supplementary_impacts, 1):
                lines.append(f"  {idx}. 曲目: {impact['track_name']}")
                lines.append(f"     平台: {impact['platform']}")
                lines.append(f"     权属方: {impact['owner_name']}")
                lines.append(f"     额外分账: ¥{impact['additional_amount']:,.2f}")
                lines.append(f"     说明: {impact['note']}")
                lines.append("")

        lines.append("-" * 80)
        lines.append("五、分账明细清单")
        lines.append("-" * 80)
        lines.append(f"  {'曲目名称':<20} {'ISRC':<15} {'平台':<10} {'权属方':<15} {'权利类型':<8} {'播放量':>10} {'分账金额':>12} {'问题标记':<10}")
        lines.append("  " + "-" * 110)

        for detail in report.details:
            has_issue = "有问题" if detail.issues else ""
            lines.append(f"  {detail.track_name:<18} {detail.isrc:<15} {detail.platform:<10} {detail.owner_name:<13} {detail.right_type.value:<8} {detail.play_count:>10,} {detail.settlement_amount:>12,.2f} {has_issue:<10}")

        lines.append("")
        lines.append("=" * 80)
        lines.append("                    报告结束")
        lines.append("=" * 80)

        return "\n".join(lines)

    def generate_csv_details(self, details: List[SettlementDetail]) -> str:
        lines = []
        header = [
            "明细ID", "批次ID", "曲目ID", "曲目名称", "ISRC", "平台",
            "播放量", "总收入", "权利类型", "权属方ID", "权属方名称",
            "权属比例", "合同比例", "最终比例", "分账金额",
            "是否补录", "问题数量", "处理说明"
        ]
        lines.append(",".join(header))

        for detail in details:
            row = [
                detail.detail_id,
                detail.settlement_batch_id,
                detail.track_id,
                f'"{detail.track_name}"',
                detail.isrc,
                detail.platform,
                str(detail.play_count),
                f"{detail.total_revenue:.2f}",
                detail.right_type.value,
                detail.owner_id,
                f'"{detail.owner_name}"',
                f"{detail.ownership_ratio:.4f}",
                f"{detail.contract_ratio:.4f}",
                f"{detail.final_ratio:.4f}",
                f"{detail.settlement_amount:.2f}",
                "是" if detail.is_supplementary else "否",
                str(len(detail.issues)),
                f'"{"; ".join(detail.processing_notes)}"'
            ]
            lines.append(",".join(row))

        return "\n".join(lines)

    def generate_issues_csv(self, issues: List[DataIssue]) -> str:
        lines = []
        header = [
            "问题ID", "冲突类型", "严重程度", "描述",
            "关联记录", "处理建议", "涉及金额", "是否已解决"
        ]
        lines.append(",".join(header))

        for issue in issues:
            row = [
                issue.issue_id,
                issue.conflict_type.value if issue.conflict_type else "",
                issue.severity,
                f'"{issue.description}"',
                f'"{", ".join(issue.related_records)}"',
                f'"{issue.suggestion}"',
                f"{issue.affected_amount:.2f}",
                "是" if issue.resolved else "否"
            ]
            lines.append(",".join(row))

        return "\n".join(lines)

    def save_report_files(self, report: SettlementReport, details: List[SettlementDetail]) -> Dict[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{report.settlement_month}_{report.batch_id}_{timestamp}"

        text_report = self.generate_text_report(report)
        text_path = self.output_dir / f"{base_name}_报告.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text_report)

        csv_details = self.generate_csv_details(details)
        csv_path = self.output_dir / f"{base_name}_明细.csv"
        with open(csv_path, 'w', encoding='utf-8-sig') as f:
            f.write(csv_details)

        csv_issues = self.generate_issues_csv(report.issues)
        issues_path = self.output_dir / f"{base_name}_问题.csv"
        with open(issues_path, 'w', encoding='utf-8-sig') as f:
            f.write(csv_issues)

        return {
            'text_report': str(text_path),
            'details_csv': str(csv_path),
            'issues_csv': str(issues_path)
        }


class SettlementQuery:
    def __init__(self, details: List[SettlementDetail]):
        self.details = details

    def filter_by_track(self, track_id: str) -> List[SettlementDetail]:
        return [d for d in self.details if d.track_id == track_id]

    def filter_by_owner(self, owner_id: str) -> List[SettlementDetail]:
        return [d for d in self.details if d.owner_id == owner_id]

    def filter_by_platform(self, platform: str) -> List[SettlementDetail]:
        return [d for d in self.details if d.platform == platform]

    def filter_with_issues(self) -> List[SettlementDetail]:
        return [d for d in self.details if len(d.issues) > 0]

    def filter_supplementary(self) -> List[SettlementDetail]:
        return [d for d in self.details if d.is_supplementary]

    def get_summary_by_owner(self) -> Dict[str, Dict]:
        summary = {}
        for detail in self.details:
            if detail.owner_id not in summary:
                summary[detail.owner_id] = {
                    'owner_name': detail.owner_name,
                    'total_amount': 0.0,
                    'tracks_count': set(),
                    'details_count': 0,
                    'issues_count': 0
                }
            summary[detail.owner_id]['total_amount'] += detail.settlement_amount
            summary[detail.owner_id]['tracks_count'].add(detail.track_id)
            summary[detail.owner_id]['details_count'] += 1
            summary[detail.owner_id]['issues_count'] += len(detail.issues)

        for owner_id in summary:
            summary[owner_id]['tracks_count'] = len(summary[owner_id]['tracks_count'])

        return summary

    def get_summary_by_platform(self) -> Dict[str, Dict]:
        summary = {}
        for detail in self.details:
            if detail.platform not in summary:
                summary[detail.platform] = {
                    'total_amount': 0.0,
                    'total_plays': 0,
                    'tracks_count': set(),
                    'details_count': 0
                }
            summary[detail.platform]['total_amount'] += detail.settlement_amount
            summary[detail.platform]['total_plays'] += detail.play_count
            summary[detail.platform]['tracks_count'].add(detail.track_id)
            summary[detail.platform]['details_count'] += 1

        for platform in summary:
            summary[platform]['tracks_count'] = len(summary[platform]['tracks_count'])

        return summary

    def export_owner_statement(self, owner_id: str) -> str:
        owner_details = self.filter_by_owner(owner_id)
        if not owner_details:
            return f"未找到权属方 {owner_id} 的分账记录"

        owner_name = owner_details[0].owner_name
        total_amount = sum(d.settlement_amount for d in owner_details)

        lines = []
        lines.append("=" * 60)
        lines.append(f"            {owner_name} 分账对账单")
        lines.append("=" * 60)
        lines.append(f"权属方ID: {owner_id}")
        lines.append(f"总金额: ¥{total_amount:,.2f}")
        lines.append(f"明细数量: {len(owner_details)} 条")
        lines.append("")
        lines.append("-" * 60)
        lines.append(f"{'曲目名称':<20} {'平台':<10} {'权利类型':<8} {'播放量':>10} {'分账金额':>12}")
        lines.append("-" * 60)

        for detail in owner_details:
            lines.append(f"{detail.track_name:<18} {detail.platform:<10} {detail.right_type.value:<8} {detail.play_count:>10,} {detail.settlement_amount:>12,.2f}")

        lines.append("-" * 60)
        lines.append(f"{'合计':<48} {total_amount:>12,.2f}")
        lines.append("=" * 60)

        return "\n".join(lines)
