from datetime import datetime
from typing import List, Dict
from dataclasses import asdict

from models import (
    ExportOrder, InsurancePolicy, ClaimRecord, RecoveryRecord,
    AbnormalRecord, VerificationStatus, VerificationCaliber
)
from ledger_service import RecoveryLedgerService


class ReportGenerator:
    def __init__(self, service: RecoveryLedgerService):
        self.service = service

    def generate_recovery_report(self, report_date: datetime = None) -> str:
        report_date = report_date or datetime.now()
        
        summary = self._calculate_summary()
        abnormal_records = self.service.get_abnormal_records(unresolved_only=False)
        
        report = []
        report.append("=" * 80)
        report.append(f"                    出口信用险追偿台账报告")
        report.append(f"                    报告日期：{report_date.strftime('%Y年%m月%d日')}")
        report.append("=" * 80)
        report.append("")
        
        report.append("【一、总体情况概览】")
        report.append("-" * 80)
        report.append(f"  承保订单总数：{summary['total_orders']} 笔")
        report.append(f"  有效保单数：{summary['valid_policies']} 份")
        report.append(f"  累计赔付金额：{summary['total_claims']:,.2f} USD")
        report.append(f"  累计追偿到账：{summary['total_recoveries']:,.2f} USD")
        report.append(f"  追偿率：{summary['recovery_rate']:.1%}")
        report.append("")
        report.append("  ▶ 结论来由：")
        report.append(f"    追偿率 = 累计追偿到账金额 ÷ 累计赔付金额 × 100%")
        report.append(f"    = {summary['total_recoveries']:,.2f} ÷ {summary['total_claims']:,.2f} × 100%")
        report.append("")
        
        report.append("【二、核销进度明细】")
        report.append("-" * 80)
        report.append(f"  全额核销：{summary['full_verified']} 笔 ({summary['full_verified_amount']:,.2f} USD)")
        report.append(f"  部分核销：{summary['partial_verified']} 笔 ({summary['partial_verified_amount']:,.2f} USD)")
        report.append(f"  待核销：{summary['pending_verified']} 笔 ({summary['pending_verified_amount']:,.2f} USD)")
        report.append("")
        report.append("  ▶ 结论来由：")
        report.append("    按每笔赔付对应的追偿到账金额统计：")
        report.append("    • 全额核销：追偿到账 ≥ 赔付金额")
        report.append("    • 部分核销：0 < 追偿到账 < 赔付金额")
        report.append("    • 待核销：暂无追偿到账")
        report.append("")
        
        report.append("【三、异常事项清单（需重点关注）】")
        report.append("-" * 80)
        if abnormal_records:
            for i, abn in enumerate(abnormal_records, 1):
                status = "☐ 待处理" if not abn.is_resolved else "☑ 已处理"
                report.append(f"  {i}. [{abn.abnormal_type.value}] {status}")
                report.append(f"     涉及金额：{abn.amount:,.2f} {abn.currency}")
                report.append(f"     情况说明：{abn.description}")
                report.append(f"     发现日期：{abn.detected_date.strftime('%Y-%m-%d')}")
                if abn.is_resolved and abn.resolution:
                    report.append(f"     处理结果：{abn.resolution}")
                report.append("")
        else:
            report.append("  暂无异常记录")
            report.append("")
        
        report.append("【四、典型案例追踪】")
        report.append("-" * 80)
        report.extend(self._generate_case_studies())
        report.append("")
        
        report.append("【五、金额核销口径说明】")
        report.append("-" * 80)
        calibers = self.service.get_verification_calibers()
        for caliber in calibers:
            report.append(f"  ■ {caliber.name}")
            report.append(f"    说明：{caliber.description}")
            report.append(f"    计算公式：{caliber.formula}")
            report.append(f"    举例：{caliber.example}")
            report.append(f"    适用场景：{', '.join(caliber.applicable_scenarios)}")
            report.append("")
        
        report.append("=" * 80)
        report.append("  【转发提示】本报告金额均按\"先冲抵本金后算收益\"口径统计（CALIBER_001），")
        report.append("  即追偿款优先用于冲抵已赔付的本金，超出部分才计入追偿收益。")
        report.append("  如需按其他口径统计，请与风控部门确认。")
        report.append("=" * 80)
        
        return "\n".join(report)

    def _calculate_summary(self) -> Dict:
        total_orders = len(self.service.orders)
        valid_policies = sum(1 for p in self.service.policies.values() if p.is_valid)
        total_claims = sum(c.approved_amount for c in self.service.claims.values())
        total_recoveries = sum(r.recovery_amount for r in self.service.recoveries.values())
        
        claims_by_status = {
            VerificationStatus.FULL: [],
            VerificationStatus.PARTIAL: [],
            VerificationStatus.PENDING: []
        }
        
        for claim in self.service.claims.values():
            claim_recoveries = [r for r in self.service.recoveries.values() if r.claim_id == claim.claim_id]
            claim_recovered = sum(r.recovery_amount for r in claim_recoveries)
            
            if claim_recovered >= claim.approved_amount:
                claims_by_status[VerificationStatus.FULL].append(claim)
            elif claim_recovered > 0:
                claims_by_status[VerificationStatus.PARTIAL].append(claim)
            else:
                claims_by_status[VerificationStatus.PENDING].append(claim)
        
        return {
            "total_orders": total_orders,
            "valid_policies": valid_policies,
            "total_claims": total_claims,
            "total_recoveries": total_recoveries,
            "recovery_rate": total_recoveries / total_claims if total_claims > 0 else 0,
            "full_verified": len(claims_by_status[VerificationStatus.FULL]),
            "full_verified_amount": sum(c.approved_amount for c in claims_by_status[VerificationStatus.FULL]),
            "partial_verified": len(claims_by_status[VerificationStatus.PARTIAL]),
            "partial_verified_amount": sum(c.approved_amount for c in claims_by_status[VerificationStatus.PARTIAL]),
            "pending_verified": len(claims_by_status[VerificationStatus.PENDING]),
            "pending_verified_amount": sum(c.approved_amount for c in claims_by_status[VerificationStatus.PENDING]),
        }

    def _generate_case_studies(self) -> List[str]:
        cases = []
        
        orders_with_chain = []
        for order_id in self.service.orders:
            chain = self.service.get_order_chain(order_id)
            if chain["claims"]:
                orders_with_chain.append(chain)
        
        orders_with_chain.sort(key=lambda x: sum(c.approved_amount for c in x["claims"]), reverse=True)
        
        for i, chain in enumerate(orders_with_chain[:3], 1):
            order = chain["order"]
            claims = chain["claims"]
            recoveries = chain["recoveries"]
            
            total_claim = sum(c.approved_amount for c in claims)
            total_recovery = sum(r.recovery_amount for r in recoveries)
            recovery_rate = total_recovery / total_claim if total_claim > 0 else 0
            
            cases.append(f"  案例 {i}：{order.buyer_name}（{order.buyer_country}）")
            cases.append(f"    订单号：{order.order_id}")
            cases.append(f"    出运日期：{order.shipment_date.strftime('%Y-%m-%d') if order.shipment_date else '未安排'}")
            cases.append(f"    货值：{order.total_amount:,.2f} {order.currency}")
            cases.append(f"    累计赔付：{total_claim:,.2f} {order.currency}")
            cases.append(f"    累计追偿：{total_recovery:,.2f} {order.currency}")
            cases.append(f"    追偿进度：{recovery_rate:.1%}")
            
            if claims:
                latest_claim = max(claims, key=lambda c: c.claim_date)
                cases.append(f"    最近赔付：{latest_claim.claim_date.strftime('%Y-%m-%d')} - {latest_claim.claim_reason}")
            
            if recoveries:
                latest_recovery = max(recoveries, key=lambda r: r.recovery_date)
                cases.append(f"    最近追偿：{latest_recovery.recovery_date.strftime('%Y-%m-%d')} - {latest_recovery.recovery_channel}")
            
            cases.append("")
        
        if not cases:
            cases.append("  暂无案例数据")
        
        return cases

    def export_to_file(self, filename: str = None) -> str:
        if not filename:
            filename = f"追偿台账报告_{datetime.now().strftime('%Y%m%d')}.txt"
        
        content = self.generate_recovery_report()
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filename

    def generate_simple_summary(self) -> str:
        summary = self._calculate_summary()
        
        lines = []
        lines.append("【追偿台账快报】")
        lines.append(f"累计赔付：{summary['total_claims']:,.0f} USD")
        lines.append(f"累计追偿：{summary['total_recoveries']:,.0f} USD")
        lines.append(f"追偿率：{summary['recovery_rate']:.1%}")
        lines.append(f"未解决异常：{len(self.service.get_abnormal_records(unresolved_only=True))} 项")
        
        return " ｜ ".join(lines)
