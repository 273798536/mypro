import pandas as pd
from typing import List
from .models import CommissionResult, ValidationIssue
from datetime import datetime


class ResultExporter:
    def __init__(self, results: List[CommissionResult], issues: List[ValidationIssue]):
        self.results = results
        self.issues = issues
    
    def export_to_csv(self, filepath: str) -> None:
        data = []
        for r in self.results:
            data.append({
                '订单号': r.order_id,
                '渠道': r.channel,
                '渠道类型': r.channel_type.value,
                '入住日期': r.checkin_date.isoformat(),
                '退房日期': r.checkout_date.isoformat(),
                '订单类型': r.order_type.value,
                '房晚数': r.room_nights,
                '订单总额': round(r.total_amount, 2),
                '退款金额': round(r.refund_amount, 2),
                '净金额': round(r.net_amount, 2),
                '适用佣金率': f"{r.contract_rate * 100:.1f}%",
                '计算佣金': round(r.calculated_commission, 2),
                '预期佣金': round(r.expected_commission, 2),
                '佣金差异': round(r.difference, 2),
                '是否有问题': '是' if r.has_issues else '否',
                '问题描述': '; '.join(r.issues),
                '涉及材料': ', '.join(r.source_materials)
            })
        
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
    
    def export_issues_to_csv(self, filepath: str) -> None:
        data = []
        for issue in self.issues:
            data.append({
                '严重程度': issue.severity,
                '问题描述': issue.message,
                '来源文件': issue.source_file,
                '行号': issue.row_number or '',
                '字段名': issue.field_name or '',
                '订单号': issue.order_id or ''
            })
        
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
    
    def export_summary(self, filepath: str, channel_summary: dict) -> None:
        data = []
        for channel, summary in channel_summary.items():
            data.append({
                '渠道': channel,
                '订单数': summary['order_count'],
                '订单总额': round(summary['total_amount'], 2),
                '退款总额': round(summary['refund_amount'], 2),
                '净金额': round(summary['net_amount'], 2),
                '计算佣金': round(summary['calculated_commission'], 2),
                '预期佣金': round(summary['expected_commission'], 2),
                '佣金差异': round(summary['difference'], 2),
                '问题订单数': summary['issue_count'],
                '半日房订单': summary['half_day_count'],
                '跨夜退款订单': summary['cross_night_refund_count']
            })
        
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
    
    def export_report(self, filepath: str, analysis_report: str) -> None:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(analysis_report)
