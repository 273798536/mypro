from datetime import datetime
from typing import Optional

from .models import (
    SponsorshipContract,
    SettlementRecord,
    IssueRecord,
    SettlementStatus,
    SettlementContext,
)


class DocumentExporter:
    def __init__(self, context: SettlementContext):
        self.context = context

    def generate_settlement_letter(self, contract_id: str, output_path: str) -> None:
        contract = self.context.contracts.get(contract_id)
        settlement = self.context.settlements.get(contract_id)
        
        if not contract or not settlement:
            print(f"[导出错误] 合同或结算记录不存在: {contract_id}")
            return
        
        issues = [
            issue for issue in self.context.issues.values()
            if issue.contract_id == contract_id
        ]
        
        pending_issues = [i for i in issues if i.issue_status.value in ["pending_confirmation", "exception"]]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(" " * 30 + "赞助结算确认函\n\n")
            f.write("=" * 70 + "\n\n")
            
            f.write(f"致：{contract.sponsor_name}\n\n")
            f.write(f"日期：{datetime.now().strftime('%Y年%m月%d日')}\n\n")
            f.write(f"合同编号：{contract.contract_id}\n\n")
            
            f.write("-" * 70 + "\n")
            f.write("一、结算明细\n")
            f.write("-" * 70 + "\n\n")
            
            details = settlement.calculation_details
            base = details.get("base_breakdown", {})
            
            f.write(f"  1. 基础赞助费用：      ¥{base.get('base_fee', 0):,.2f}\n")
            f.write(f"  2. 品牌露出费用：      ¥{base.get('exposure_fee', 0):,.2f}\n")
            f.write(f"  3. 直播权益费用：      ¥{base.get('livestream_fee', 0):,.2f}\n")
            f.write(f"  4. 赛事名次奖金：      ¥{base.get('ranking_bonus', 0):,.2f}\n")
            f.write(f"  {'-'*40}\n")
            f.write(f"  费用合计：             ¥{settlement.total_amount:,.2f}\n\n")
            
            if settlement.deduction_amount > 0:
                f.write(f"  费用扣减：            -¥{settlement.deduction_amount:,.2f}\n")
                f.write(f"  {'-'*40}\n")
            
            f.write(f"  最终结算金额：         ¥{settlement.final_amount:,.2f}\n\n")
            
            f.write("-" * 70 + "\n")
            f.write("二、权益完成情况\n")
            f.write("-" * 70 + "\n\n")
            
            exp_details = details.get("exposure_details", {})
            for exp_type, data in exp_details.items():
                status = "✓ 达标" if data.get("meets_requirement") else "✗ 未达标"
                f.write(f"  {exp_type}：{data.get('actual', 0)}/{data.get('required', 0)} 次 {status}\n")
            
            live_details = details.get("livestream_details", {})
            dur_data = live_details.get("duration", {})
            dur_status = "✓ 达标" if dur_data.get("meets_requirement") else "✗ 未达标"
            f.write(f"\n  直播时长：{dur_data.get('required_minutes', 0)} 分钟 {dur_status}\n")
            
            rank_details = details.get("ranking_details", {})
            if "rank" in rank_details:
                f.write(f"  赛事名次：第{rank_details['rank']}名\n")
                if rank_details.get("is_rematch"):
                    f.write(f"    （注：该名次为补赛后最终结果）\n")
            
            f.write("\n")
            
            if pending_issues:
                f.write("-" * 70 + "\n")
                f.write("三、待确认事项\n")
                f.write("-" * 70 + "\n\n")
                f.write("本结算存在以下待确认事项，请贵方确认后正式生效：\n\n")
                
                for i, issue in enumerate(pending_issues, 1):
                    f.write(f"  {i}. {issue.title}\n")
                    f.write(f"     {issue.description}\n")
                    f.write(f"     原因：{issue.root_cause.split(chr(10))[0]}\n\n")
                
                f.write("请贵方收到本函后3个工作日内反馈确认意见。\n\n")
            
            f.write("-" * 70 + "\n")
            f.write("四、联系方式\n")
            f.write("-" * 70 + "\n\n")
            f.write("  如有疑问，请联系：\n")
            f.write("  电竞运营部\n")
            f.write("  电话：400-XXX-XXXX\n")
            f.write("  邮箱：finance@esports.com\n\n")
            
            f.write("=" * 70 + "\n")
            f.write(" " * 20 + "电竞俱乐部 财务部\n")
            f.write(" " * 25 + datetime.now().strftime('%Y年%m月%d日') + "\n")
            f.write("=" * 70 + "\n")
        
        print(f"[导出] 结算函已生成: {output_path}")

    def generate_dispute_letter(self, contract_id: str, issue_id: str, output_path: str) -> None:
        contract = self.context.contracts.get(contract_id)
        issue = self.context.issues.get(issue_id)
        
        if not contract or not issue:
            print(f"[导出错误] 合同或问题记录不存在")
            return
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(" " * 30 + "结算事项沟通函\n\n")
            f.write("=" * 70 + "\n\n")
            
            f.write(f"致：{contract.sponsor_name}\n\n")
            f.write(f"日期：{datetime.now().strftime('%Y年%m月%d日')}\n\n")
            f.write(f"合同编号：{contract.contract_id}\n")
            f.write(f"事项编号：{issue_id}\n\n")
            
            f.write("-" * 70 + "\n")
            f.write("事由\n")
            f.write("-" * 70 + "\n\n")
            f.write(f"  {issue.title}\n\n")
            f.write(f"  {issue.description}\n\n")
            
            f.write("-" * 70 + "\n")
            f.write("情况说明\n")
            f.write("-" * 70 + "\n\n")
            for line in issue.root_cause.split('\n'):
                f.write(f"  {line}\n")
            f.write("\n")
            
            f.write("-" * 70 + "\n")
            f.write("我方建议\n")
            f.write("-" * 70 + "\n\n")
            for line in issue.handling_suggestion.split('\n'):
                f.write(f"  {line}\n")
            f.write("\n")
            
            f.write("-" * 70 + "\n")
            f.write("后续安排\n")
            f.write("-" * 70 + "\n\n")
            f.write("  请贵方于3个工作日内予以回复，以便尽快完成结算工作。\n\n")
            f.write("  联系方式：\n")
            f.write("  电竞运营部\n")
            f.write("  电话：400-XXX-XXXX\n\n")
            
            f.write("=" * 70 + "\n")
            f.write(" " * 20 + "电竞俱乐部 财务部\n")
            f.write("=" * 70 + "\n")
        
        print(f"[导出] 沟通函已生成: {output_path}")

    def export_settlement_summary(self, output_path: str) -> None:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("电竞赛事赞助结算汇总表\n")
            f.write("=" * 100 + "\n\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n\n")
            
            headers = ["合同编号", "赞助商", "基础费用", "露出费用", "直播费用", "名次奖金", "扣减", "最终金额", "状态"]
            f.write(f"{' | '.join(headers)}\n")
            f.write("-" * 100 + "\n")
            
            status_map = {
                SettlementStatus.DRAFT: "草稿",
                SettlementStatus.VERIFYING: "核验中",
                SettlementStatus.ISSUES_FOUND: "有问题",
                SettlementStatus.READY_FOR_SETTLEMENT: "可结算",
                SettlementStatus.SETTLED: "已结算",
                SettlementStatus.DISPUTED: "争议中",
            }
            
            for contract_id, settlement in self.context.settlements.items():
                contract = self.context.contracts.get(contract_id)
                if not contract:
                    continue
                
                row = [
                    contract_id,
                    contract.sponsor_name,
                    f"{settlement.base_fee:,.0f}",
                    f"{settlement.exposure_fee:,.0f}",
                    f"{settlement.livestream_fee:,.0f}",
                    f"{settlement.ranking_bonus:,.0f}",
                    f"{settlement.deduction_amount:,.0f}",
                    f"{settlement.final_amount:,.0f}",
                    status_map.get(settlement.status, settlement.status.value),
                ]
                f.write(f"{' | '.join(row)}\n")
            
            f.write("\n" + "=" * 100 + "\n")
            
            total_final = sum(s.final_amount for s in self.context.settlements.values())
            f.write(f"\n结算总额: ¥{total_final:,.2f}\n")
            
            pending_count = sum(
                1 for s in self.context.settlements.values()
                if s.status == SettlementStatus.ISSUES_FOUND
            )
            f.write(f"待确认合同: {pending_count} 份\n")
        
        print(f"[导出] 结算汇总表已保存: {output_path}")
