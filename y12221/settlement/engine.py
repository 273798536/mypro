from typing import Dict, List
from datetime import datetime

from .models import (
    SettlementContext,
    SettlementRecord,
    IssueRecord,
    SettlementStatus,
)
from .importer import DataImporter
from .verifier import RightsVerifier
from .calculator import FeeCalculator
from .issues import IssueManager
from .exporter import DocumentExporter


class SettlementEngine:
    def __init__(self):
        self.context = SettlementContext()
        self.importer = DataImporter(self.context)
        self.verifier = RightsVerifier(self.context)
        self.calculator = FeeCalculator(self.context)
        self.issue_manager = IssueManager(self.context)
        self.exporter = DocumentExporter(self.context)

    def run_full_settlement(self, data_dir: str, output_dir: str) -> Dict[str, List]:
        print("\n" + "="*70)
        print("电竞赛事赞助结算系统 - 完整结算流程")
        print("="*70 + "\n")
        
        print("[步骤 1/5] 导入数据...")
        import_results = self.importer.import_all_from_dir(data_dir)
        print(f"  - 导入合同: {len(import_results.get('contracts', []))} 份")
        print(f"  - 导入直播: {len(import_results.get('livestreams', []))} 条")
        print(f"  - 导入露出: {len(import_results.get('exposures', []))} 条")
        print(f"  - 导入结果: {len(import_results.get('results', []))} 条\n")
        
        print("[步骤 2/5] 权益核验...")
        issues = self.verifier.verify_all()
        total_issues = sum(len(v) for v in issues.values())
        print(f"  - 发现问题: {total_issues} 项\n")
        
        print("[步骤 3/5] 计算费用...")
        settlements = self.calculator.calculate_all()
        print(f"  - 完成结算: {len(settlements)} 份合同\n")
        
        print("[步骤 4/5] 生成问题清单...")
        self.issue_manager.print_issue_summary()
        self.issue_manager.print_pending_issues()
        
        print("[步骤 5/5] 导出结算文件...")
        self._export_all_documents(output_dir)
        
        print("="*70)
        print("结算流程完成!")
        print("="*70 + "\n")
        
        return {
            "imported": import_results,
            "issues": issues,
            "settlements": settlements,
        }

    def run_incremental_update(self, data_dir: str, output_dir: str) -> Dict:
        print("\n" + "="*70)
        print("电竞赛事赞助结算系统 - 增量更新")
        print("="*70 + "\n")
        
        print("[步骤 1/4] 导入增量数据...")
        import_results = self.importer.import_all_from_dir(data_dir)
        total_imported = sum(len(v) for v in import_results.values())
        
        if total_imported == 0:
            print("  - 没有新数据需要导入\n")
            return {"status": "no_new_data"}
        
        print(f"  - 新增数据: {total_imported} 条\n")
        
        print("[步骤 2/4] 重新核验权益...")
        issues = self.verifier.verify_all()
        new_issues = sum(len(v) for v in issues.values())
        print(f"  - 问题总数: {new_issues} 项\n")
        
        print("[步骤 3/4] 重新计算费用...")
        settlements = self.calculator.calculate_all()
        
        for contract_id, settlement in settlements.items():
            if settlement.version > 1:
                print(f"  - {contract_id}: 版本 {settlement.version} (原版本 {settlement.version - 1})")
                if settlement.version_history:
                    last = settlement.version_history[-1]
                    old_amount = last.get('final_amount', 0)
                    new_amount = settlement.final_amount
                    diff = new_amount - old_amount
                    if diff != 0:
                        direction = "增加" if diff > 0 else "减少"
                        print(f"    -> 金额{direction}: ¥{abs(diff):,.2f}")
        
        print()
        
        print("[步骤 4/4] 更新导出文件...")
        self._export_all_documents(output_dir)
        
        print("="*70)
        print("增量更新完成!")
        print("="*70 + "\n")
        
        return {
            "imported": import_results,
            "issues": issues,
            "settlements": settlements,
        }

    def _export_all_documents(self, output_dir: str) -> None:
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        summary_path = f"{output_dir}/settlement_summary.txt"
        self.exporter.export_settlement_summary(summary_path)
        
        issues_path = f"{output_dir}/issues_report.txt"
        self.issue_manager.export_issues_report(issues_path)
        
        for contract_id in self.context.contracts:
            letter_path = f"{output_dir}/settlement_letter_{contract_id}.txt"
            self.exporter.generate_settlement_letter(contract_id, letter_path)
        
        pending = self.issue_manager.get_pending_issues()
        for issue in pending:
            letter_path = f"{output_dir}/dispute_letter_{issue.issue_id}.txt"
            self.exporter.generate_dispute_letter(
                issue.contract_id, 
                issue.issue_id, 
                letter_path
            )
        
        snapshot_path = f"{output_dir}/snapshot.json"
        self.importer.export_snapshot(snapshot_path)

    def print_settlement_detail(self, contract_id: str) -> None:
        contract = self.context.contracts.get(contract_id)
        settlement = self.context.settlements.get(contract_id)
        
        if not contract or not settlement:
            print(f"结算记录不存在: {contract_id}")
            return
        
        status_map = {
            SettlementStatus.DRAFT: "草稿",
            SettlementStatus.VERIFYING: "核验中",
            SettlementStatus.ISSUES_FOUND: "有问题待确认",
            SettlementStatus.READY_FOR_SETTLEMENT: "可结算",
            SettlementStatus.SETTLED: "已结算",
            SettlementStatus.DISPUTED: "争议中",
        }
        
        print("\n" + "="*70)
        print(f"结算详情 - {contract.sponsor_name}")
        print("="*70)
        print(f"  合同编号: {contract.contract_id}")
        print(f"  结算状态: {status_map.get(settlement.status, settlement.status.value)}")
        print(f"  结算版本: v{settlement.version}")
        print(f"  更新时间: {settlement.updated_at}")
        print("-"*70)
        print("费用明细:")
        print(f"  基础赞助费: ¥{settlement.base_fee:,.2f}")
        print(f"  品牌露出费: ¥{settlement.exposure_fee:,.2f}")
        print(f"  直播权益费: ¥{settlement.livestream_fee:,.2f}")
        print(f"  名次奖金:   ¥{settlement.ranking_bonus:,.2f}")
        print(f"  {'-'*30}")
        print(f"  费用合计:   ¥{settlement.total_amount:,.2f}")
        if settlement.deduction_amount > 0:
            print(f"  费用扣减:  -¥{settlement.deduction_amount:,.2f}")
            print(f"  {'-'*30}")
        print(f"  最终金额:   ¥{settlement.final_amount:,.2f}")
        print("-"*70)
        
        if settlement.issue_ids:
            print(f"关联问题 ({len(settlement.issue_ids)} 项):")
            for issue_id in settlement.issue_ids:
                issue = self.context.issues.get(issue_id)
                if issue:
                    print(f"  - {issue.title} [{issue.issue_status.value}]")
        
        if settlement.version_history:
            print("-"*70)
            print("版本历史:")
            for entry in settlement.version_history:
                changes = entry.get('changes', {})
                change_desc = ", ".join(
                    f"{k}: {v.get('old', 0):,.0f} -> {v.get('new', 0):,.0f}"
                    for k, v in changes.items()
                )
                print(f"  v{entry['version']}: ¥{entry['final_amount']:,.2f} ({change_desc or '无变化'})")
        
        print("="*70 + "\n")
