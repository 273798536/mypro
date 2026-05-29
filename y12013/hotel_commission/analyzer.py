from typing import List, Dict
from collections import defaultdict
from .models import CommissionResult, ValidationIssue, OrderType


class ChannelAnalyzer:
    def __init__(self, results: List[CommissionResult]):
        self.results = results
    
    def detect_anomalies(self) -> Dict[str, List[CommissionResult]]:
        anomalies = defaultdict(list)
        
        for result in self.results:
            if result.has_difference:
                anomalies['commission_difference'].append(result)
            
            if result.has_issues:
                anomalies['has_issues'].append(result)
            
            if result.order_type == OrderType.HALF_DAY and len(result.issues) > 0:
                anomalies['half_day_issues'].append(result)
            
            if any('跨夜' in issue for issue in result.issues):
                anomalies['cross_night_refund'].append(result)
            
            if result.refund_amount > result.total_amount * 0.5:
                anomalies['high_refund'].append(result)
        
        return dict(anomalies)
    
    def get_channel_allocation(self) -> Dict[str, dict]:
        allocation = defaultdict(lambda: {
            'total_commission': 0,
            'order_count': 0,
            'amount_share': 0,
            'commission_share': 0
        })
        
        total_commission_all = sum(r.calculated_commission for r in self.results)
        total_amount_all = sum(r.net_amount for r in self.results)
        
        for result in self.results:
            channel = result.channel
            allocation[channel]['total_commission'] += result.calculated_commission
            allocation[channel]['order_count'] += 1
            allocation[channel]['total_amount'] = allocation[channel].get('total_amount', 0) + result.net_amount
        
        for channel in allocation:
            allocation[channel]['amount_share'] = (
                allocation[channel]['total_amount'] / total_amount_all * 100 if total_amount_all > 0 else 0
            )
            allocation[channel]['commission_share'] = (
                allocation[channel]['total_commission'] / total_commission_all * 100 if total_commission_all > 0 else 0
            )
        
        return dict(allocation)
    
    def get_issue_summary(self) -> Dict[str, int]:
        summary = defaultdict(int)
        
        for result in self.results:
            for issue in result.issues:
                if '半日房' in issue:
                    summary['半日房相关'] += 1
                elif '跨夜' in issue:
                    summary['跨夜退款'] += 1
                elif '节假日' in issue:
                    summary['节假日房价'] += 1
                elif '房价日历缺失' in issue:
                    summary['房价日历缺失'] += 1
                elif '差异原因' in issue:
                    summary['佣金差异'] += 1
                elif '合同' in issue:
                    summary['合同配置问题'] += 1
        
        return dict(summary)
    
    def generate_analysis_report(self) -> str:
        report = []
        
        report.append("=" * 60)
        report.append("酒店渠道佣金复核分析报告")
        report.append("=" * 60)
        report.append("")
        
        total_orders = len(self.results)
        report.append(f"订单总数: {total_orders}")
        
        anomalies = self.detect_anomalies()
        
        report.append(f"有差异订单: {len(anomalies.get('commission_difference', []))}")
        report.append(f"有问题订单: {len(anomalies.get('has_issues', []))}")
        report.append(f"半日房问题: {len(anomalies.get('half_day_issues', []))}")
        report.append(f"跨夜退款: {len(anomalies.get('cross_night_refund', []))}")
        report.append("")
        
        report.append("-" * 60)
        report.append("渠道分摊分析")
        report.append("-" * 60)
        
        allocation = self.get_channel_allocation()
        for channel, data in sorted(allocation.items()):
            report.append(f"\n{channel}:")
            report.append(f"  订单数: {data['order_count']}")
            report.append(f"  佣金总额: {data['total_commission']:.2f}元")
            report.append(f"  金额占比: {data['amount_share']:.1f}%")
            report.append(f"  佣金占比: {data['commission_share']:.1f}%")
        
        report.append("")
        
        report.append("-" * 60)
        report.append("问题分类统计")
        report.append("-" * 60)
        
        issue_summary = self.get_issue_summary()
        for issue_type, count in issue_summary.items():
            report.append(f"{issue_type}: {count}次")
        
        report.append("")
        
        report.append("-" * 60)
        report.append("需要复核的重点订单")
        report.append("-" * 60)
        
        issue_orders = [r for r in self.results if r.has_issues]
        for result in issue_orders[:10]:
            report.append(f"\n订单号: {result.order_id}")
            report.append(f"  渠道: {result.channel}")
            report.append(f"  入住: {result.checkin_date} 至 {result.checkout_date}")
            report.append(f"  佣金差异: {result.difference:.2f}元")
            report.append(f"  涉及材料: {', '.join(result.source_materials)}")
            report.append(f"  问题:")
            for issue in result.issues:
                report.append(f"    - {issue}")
        
        if len(issue_orders) > 10:
            report.append(f"\n... 还有 {len(issue_orders) - 10} 条问题记录未显示")
        
        report.append("")
        report.append("=" * 60)
        
        return "\n".join(report)
