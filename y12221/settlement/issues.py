from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

from .models import (
    IssueRecord,
    IssueType,
    IssueStatus,
    SettlementContext,
)


class IssueManager:
    def __init__(self, context: SettlementContext):
        self.context = context

    def get_issues_by_contract(self, contract_id: str) -> List[IssueRecord]:
        return [
            issue for issue in self.context.issues.values()
            if issue.contract_id == contract_id
        ]

    def get_issues_by_type(self, issue_type: IssueType) -> List[IssueRecord]:
        return [
            issue for issue in self.context.issues.values()
            if issue.issue_type == issue_type
        ]

    def get_issues_by_status(self, status: IssueStatus) -> List[IssueRecord]:
        return [
            issue for issue in self.context.issues.values()
            if issue.issue_status == status
        ]

    def get_pending_issues(self) -> List[IssueRecord]:
        return [
            issue for issue in self.context.issues.values()
            if issue.issue_status in [IssueStatus.PENDING_CONFIRMATION, IssueStatus.EXCEPTION]
        ]

    def resolve_issue(self, issue_id: str, resolution_note: str) -> Optional[IssueRecord]:
        issue = self.context.issues.get(issue_id)
        if not issue:
            return None
        
        issue.issue_status = IssueStatus.RESOLVED
        issue.resolved_at = datetime.now().isoformat()
        issue.resolution_note = resolution_note
        
        print(f"[问题处理] 问题 {issue_id} 已标记为已解决")
        print(f"  - 处理说明: {resolution_note}")
        
        return issue

    def mark_exception(self, issue_id: str, dispute_remarks: str) -> Optional[IssueRecord]:
        issue = self.context.issues.get(issue_id)
        if not issue:
            return None
        
        issue.issue_status = IssueStatus.EXCEPTION
        issue.dispute_remarks = dispute_remarks
        
        print(f"[问题处理] 问题 {issue_id} 已标记为异常")
        print(f"  - 争议备注: {dispute_remarks}")
        
        return issue

    def waive_issue(self, issue_id: str, resolution_note: str) -> Optional[IssueRecord]:
        issue = self.context.issues.get(issue_id)
        if not issue:
            return None
        
        issue.issue_status = IssueStatus.WAIVED
        issue.resolved_at = datetime.now().isoformat()
        issue.resolution_note = resolution_note
        
        print(f"[问题处理] 问题 {issue_id} 已豁免")
        print(f"  - 豁免说明: {resolution_note}")
        
        return issue

    def print_issue_summary(self) -> None:
        pending = self.get_issues_by_status(IssueStatus.PENDING_CONFIRMATION)
        exceptions = self.get_issues_by_status(IssueStatus.EXCEPTION)
        resolved = self.get_issues_by_status(IssueStatus.RESOLVED)
        waived = self.get_issues_by_status(IssueStatus.WAIVED)
        
        print("\n" + "="*60)
        print("问题清单汇总")
        print("="*60)
        print(f"  待确认: {len(pending)} 项")
        print(f"  异常: {len(exceptions)} 项")
        print(f"  已解决: {len(resolved)} 项")
        print(f"  已豁免: {len(waived)} 项")
        print(f"  总计: {len(self.context.issues)} 项")
        print("="*60 + "\n")

    def print_issue_detail(self, issue_id: str) -> None:
        issue = self.context.issues.get(issue_id)
        if not issue:
            print(f"问题 {issue_id} 不存在")
            return
        
        status_map = {
            IssueStatus.PENDING_CONFIRMATION: "待确认",
            IssueStatus.EXCEPTION: "异常",
            IssueStatus.RESOLVED: "已解决",
            IssueStatus.WAIVED: "已豁免",
        }
        
        type_map = {
            IssueType.REMATCH_RECALCULATION: "补赛追溯",
            IssueType.MISSING_EXPOSURE_PROOF: "露出缺证",
            IssueType.TIE_RANKING: "名次并列",
            IssueType.INSUFFICIENT_LIVESTREAM_DURATION: "直播时长不足",
            IssueType.CONTRACT_MISMATCH: "合同不符",
            IssueType.DATA_INCONSISTENCY: "数据不一致",
        }
        
        print("\n" + "="*70)
        print(f"问题详情: {issue_id}")
        print("="*70)
        print(f"  标题: {issue.title}")
        print(f"  类型: {type_map.get(issue.issue_type, issue.issue_type.value)}")
        print(f"  状态: {status_map.get(issue.issue_status, issue.issue_status.value)}")
        print(f"  关联合同: {issue.contract_id}")
        print(f"  创建时间: {issue.created_at}")
        print("-"*70)
        print("问题描述:")
        print(f"  {issue.description}")
        print("-"*70)
        print("根本原因:")
        for line in issue.root_cause.split('\n'):
            print(f"  {line}")
        print("-"*70)
        print("处理建议:")
        for line in issue.handling_suggestion.split('\n'):
            print(f"  {line}")
        print("-"*70)
        
        if issue.resolution_note:
            print("处理说明:")
            print(f"  {issue.resolution_note}")
            if issue.resolved_at:
                print(f"  处理时间: {issue.resolved_at}")
            print("-"*70)
        
        if issue.dispute_remarks:
            print("争议备注:")
            print(f"  {issue.dispute_remarks}")
            print("-"*70)
        
        print("="*70 + "\n")

    def print_pending_issues(self) -> None:
        pending = self.get_pending_issues()
        
        if not pending:
            print("\n[问题清单] 没有待处理的问题\n")
            return
        
        print("\n" + "="*80)
        print("待处理问题清单")
        print("="*80)
        
        for i, issue in enumerate(pending, 1):
            status_icon = "⚠️" if issue.issue_status == IssueStatus.EXCEPTION else "⏳"
            print(f"\n{i}. {status_icon} {issue.title}")
            print(f"   问题ID: {issue.issue_id}")
            print(f"   合同: {issue.contract_id}")
            print(f"   状态: {'异常' if issue.issue_status == IssueStatus.EXCEPTION else '待确认'}")
            print(f"   描述: {issue.description}")
            print(f"   快速查看: issue_manager.print_issue_detail('{issue.issue_id}')")
        
        print("\n" + "="*80 + "\n")

    def get_issue_statistics(self) -> Dict[str, Dict[str, int]]:
        stats = defaultdict(lambda: defaultdict(int))
        
        for issue in self.context.issues.values():
            stats[issue.issue_type.value][issue.issue_status.value] += 1
        
        return dict(stats)

    def export_issues_report(self, output_path: str) -> None:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("电竞赛事赞助结算 - 问题清单报告\n")
            f.write("="*60 + "\n\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n\n")
            
            pending = self.get_issues_by_status(IssueStatus.PENDING_CONFIRMATION)
            exceptions = self.get_issues_by_status(IssueStatus.EXCEPTION)
            resolved = self.get_issues_by_status(IssueStatus.RESOLVED)
            
            f.write("一、汇总统计\n")
            f.write("-"*40 + "\n")
            f.write(f"  待确认问题: {len(pending)} 项\n")
            f.write(f"  异常问题: {len(exceptions)} 项\n")
            f.write(f"  已解决问题: {len(resolved)} 项\n\n")
            
            f.write("二、待处理问题明细\n")
            f.write("-"*40 + "\n\n")
            
            all_pending = pending + exceptions
            for i, issue in enumerate(all_pending, 1):
                f.write(f"{i}. {issue.title}\n")
                f.write(f"   问题ID: {issue.issue_id}\n")
                f.write(f"   状态: {'异常' if issue.issue_status == IssueStatus.EXCEPTION else '待确认'}\n")
                f.write(f"   关联合同: {issue.contract_id}\n\n")
                f.write("   问题描述:\n")
                f.write(f"      {issue.description}\n\n")
                f.write("   根本原因:\n")
                for line in issue.root_cause.split('\n'):
                    f.write(f"      {line}\n")
                f.write("\n   处理建议:\n")
                for line in issue.handling_suggestion.split('\n'):
                    f.write(f"      {line}\n")
                f.write("\n" + "-"*40 + "\n\n")
        
        print(f"[导出] 问题报告已保存: {output_path}")
