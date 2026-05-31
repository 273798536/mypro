from typing import List, Dict, Optional
from datetime import datetime
import json

from models import (
    Order, IssueRecord, BadRowRecord, TraceRecord,
    IssueType
)
from tracker import RecordStoreTracker


class ReportGenerator:
    @staticmethod
    def generate_summary_report(result: Dict, bad_rows: List[BadRowRecord]) -> str:
        report = []
        report.append("=" * 80)
        report.append("              唱片库存签名版追踪 - 发货报告摘要")
        report.append("=" * 80)
        report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("【基本统计】")
        report.append(f"  总订单数: {result['total_orders']}")
        report.append(f"  总问题数: {result['total_issues']}")
        report.append(f"  坏行数: {len(bad_rows)}")
        report.append("")
        
        report.append("【问题分类】")
        report.append(f"  签名号重复: {result['signature_duplicates']} 条")
        report.append(f"  赠品缺货: {result['gift_out_of_stock']} 条")
        report.append(f"  订单改址: {result['address_changes']} 条")
        report.append("")
        
        report.append("-" * 80)
        return "\n".join(report)

    @staticmethod
    def generate_bad_rows_report(bad_rows: List[BadRowRecord]) -> str:
        if not bad_rows:
            return ""
        
        report = []
        report.append("")
        report.append("=" * 80)
        report.append("                    坏行数据报告")
        report.append("=" * 80)
        report.append("")
        
        for i, bad_row in enumerate(bad_rows, 1):
            report.append(f"【坏行 #{i}】")
            report.append(f"  行号: {bad_row.row_number}")
            report.append(f"  源文件: {bad_row.source_file}")
            report.append(f"  原始数据: {bad_row.raw_data}")
            report.append(f"  问题: {', '.join(bad_row.issues)}")
            report.append("")
        
        report.append("-" * 80)
        return "\n".join(report)

    @staticmethod
    def generate_duplicate_report(tracker: RecordStoreTracker) -> str:
        duplicates = tracker.get_duplicate_details()
        
        if not duplicates:
            return ""
        
        report = []
        report.append("")
        report.append("=" * 80)
        report.append("                 签名号重复详细报告")
        report.append("=" * 80)
        report.append("")
        
        for key, entries in duplicates.items():
            sku, sig_num = key.split(':')
            report.append(f"【重复签名号】 SKU: {sku} | 签名号: #{sig_num}")
            report.append(f"  重复次数: {len(entries)}")
            report.append("  涉及订单:")
            
            for entry in entries:
                order_date = entry['order_date']
                date_str = order_date.strftime('%Y-%m-%d') if order_date else '未知日期'
                report.append(f"    - 订单号: {entry['order_id']}")
                report.append(f"      客户: {entry['customer_name']}")
                report.append(f"      下单日期: {date_str}")
            report.append("")
        
        report.append("-" * 80)
        report.append("⚠️  以上签名号重复问题需要独立唱片店店主复核")
        report.append("-" * 80)
        return "\n".join(report)

    @staticmethod
    def generate_gift_out_of_stock_report(issues: List[IssueRecord]) -> str:
        gift_issues = [i for i in issues if i.issue_type == IssueType.GIFT_OUT_OF_STOCK]
        
        if not gift_issues:
            return ""
        
        report = []
        report.append("")
        report.append("=" * 80)
        report.append("                   赠品缺货报告")
        report.append("=" * 80)
        report.append("")
        
        for i, issue in enumerate(gift_issues, 1):
            report.append(f"【缺货 #{i}】")
            report.append(f"  订单号: {issue.order_id}")
            report.append(f"  SKU: {issue.sku}")
            report.append(f"  描述: {issue.description}")
            if issue.source_data:
                report.append(f"  赠品名称: {issue.source_data.get('gift_name', '未知')}")
                report.append(f"  赠品SKU: {issue.source_data.get('gift_sku', '未知')}")
                report.append(f"  赠品数量: {issue.source_data.get('gift_quantity', 1)}")
            report.append("")
        
        report.append("-" * 80)
        report.append("⚠️  以上赠品缺货问题需要独立唱片店店主复核")
        report.append("-" * 80)
        return "\n".join(report)

    @staticmethod
    def generate_address_change_report(issues: List[IssueRecord]) -> str:
        address_issues = [i for i in issues if i.issue_type == IssueType.ADDRESS_CHANGED]
        
        if not address_issues:
            return ""
        
        report = []
        report.append("")
        report.append("=" * 80)
        report.append("                   订单改址报告")
        report.append("=" * 80)
        report.append("")
        
        for i, issue in enumerate(address_issues, 1):
            report.append(f"【改址 #{i}】")
            report.append(f"  订单号: {issue.order_id}")
            report.append(f"  描述: {issue.description}")
            
            if issue.source_data:
                orig = issue.source_data.get('original_address', {})
                new = issue.source_data.get('new_address', {})
                report.append(f"  客户: {issue.source_data.get('customer_name', '未知')}")
                report.append("  原地址:")
                report.append(f"    {orig.get('street', '')}, {orig.get('city', '')}")
                report.append(f"    {orig.get('state', '')} {orig.get('zip_code', '')} {orig.get('country', '')}")
                report.append("  新地址:")
                report.append(f"    {new.get('street', '')}, {new.get('city', '')}")
                report.append(f"    {new.get('state', '')} {new.get('zip_code', '')} {new.get('country', '')}")
            report.append("")
        
        report.append("-" * 80)
        report.append("⚠️  以上订单改址问题需要独立唱片店店主复核")
        report.append("-" * 80)
        return "\n".join(report)

    @staticmethod
    def generate_trace_report(trace: TraceRecord) -> str:
        report = []
        report.append("")
        report.append("=" * 80)
        report.append(f"              订单追踪报告 - {trace.order_id}")
        report.append("=" * 80)
        report.append("")
        
        if trace.order:
            report.append("【订单信息】")
            order = trace.order
            report.append(f"  订单号: {order.order_id}")
            report.append(f"  客户: {order.customer.name}")
            report.append(f"  状态: {order.status.value}")
            if order.order_date:
                report.append(f"  下单日期: {order.order_date.strftime('%Y-%m-%d')}")
            report.append("")
            
            report.append("  商品明细:")
            for item in order.items:
                sig_info = f" (签名号: #{item.signature_number})" if item.signature_number else ""
                report.append(f"    - {item.title} (SKU: {item.sku}) x{item.quantity}{sig_info}")
                if item.gifts:
                    report.append("      赠品:")
                    for gift in item.gifts:
                        status_icon = "✅" if gift.status.value == "已包含" else "❌"
                        report.append(f"        {status_icon} {gift.name} x{gift.quantity} [{gift.status.value}]")
            report.append("")
        
        report.append("【1. 库存锁定】")
        for lock in trace.inventory_locks:
            sig_info = f" (签名号: #{lock.signature_number})" if lock.signature_number else ""
            report.append(f"  锁定ID: {lock.lock_id}")
            report.append(f"  SKU: {lock.sku}{sig_info}")
            report.append(f"  锁定数量: {lock.quantity}")
            report.append(f"  锁定时间: {lock.locked_at.strftime('%Y-%m-%d %H:%M:%S')}")
            report.append(f"  锁定人: {lock.locked_by}")
            if lock.notes:
                report.append(f"  备注: {lock.notes}")
            report.append("")
        
        report.append("【2. 批次追踪】")
        for batch in trace.batch_tracking:
            report.append(f"  批次ID: {batch.batch_id}")
            report.append(f"  SKU: {batch.sku}")
            report.append(f"  签名号列表: {', '.join(['#' + s for s in batch.signature_numbers])}")
            if batch.received_date:
                report.append(f"  收货日期: {batch.received_date.strftime('%Y-%m-%d')}")
            report.append(f"  供应商: {batch.supplier}")
            report.append(f"  质检状态: {'通过' if batch.quality_check_passed else '未通过'}")
            report.append("")
        
        if trace.shipping_review:
            report.append("【3. 发货复核】")
            review = trace.shipping_review
            report.append(f"  复核ID: {review.review_id}")
            report.append(f"  复核人: {review.reviewer}")
            if review.review_date:
                report.append(f"  复核时间: {review.review_date.strftime('%Y-%m-%d %H:%M:%S')}")
            report.append(f"  复核商品: {', '.join(review.items_verified)}")
            if review.signature_numbers_verified:
                report.append(f"  签名号复核: {', '.join(['#' + s for s in review.signature_numbers_verified])}")
            if review.gifts_verified:
                report.append(f"  赠品复核: {', '.join(review.gifts_verified)}")
            report.append(f"  发现问题: {review.issues_found if review.issues_found else '无'}")
            report.append(f"  复核结果: {'✅ 已批准' if review.approved else '❌ 待处理'}")
            report.append("")
        
        if trace.issues:
            report.append("【关联问题】")
            for issue in trace.issues:
                status_icon = "🔍 待复核" if not issue.reviewed else "✅ 已复核"
                report.append(f"  {status_icon} [{issue.issue_type.value}] {issue.description}")
                if issue.reviewed:
                    report.append(f"     复核人: {issue.reviewer} | 处理方案: {issue.resolution}")
            report.append("")
        
        report.append("=" * 80)
        report.append(f"  追踪路径: 库存锁定 → 批次追踪 → 发货复核")
        report.append(f"  出问题时可凭以上信息找对应负责人确认")
        report.append("=" * 80)
        
        return "\n".join(report)

    @staticmethod
    def generate_full_report(result: Dict, bad_rows: List[BadRowRecord], 
                            tracker: RecordStoreTracker) -> str:
        report_parts = []
        
        report_parts.append(ReportGenerator.generate_summary_report(result, bad_rows))
        
        bad_rows_report = ReportGenerator.generate_bad_rows_report(bad_rows)
        if bad_rows_report:
            report_parts.append(bad_rows_report)
        
        duplicate_report = ReportGenerator.generate_duplicate_report(tracker)
        if duplicate_report:
            report_parts.append(duplicate_report)
        
        gift_report = ReportGenerator.generate_gift_out_of_stock_report(result['issues'])
        if gift_report:
            report_parts.append(gift_report)
        
        address_report = ReportGenerator.generate_address_change_report(result['issues'])
        if address_report:
            report_parts.append(address_report)
        
        return "\n".join(report_parts)

    @staticmethod
    def export_json(result: Dict, bad_rows: List[BadRowRecord], 
                   traces: List[TraceRecord], output_file: str):
        export_data = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_orders': result['total_orders'],
                'total_issues': result['total_issues'],
                'signature_duplicates': result['signature_duplicates'],
                'gift_out_of_stock': result['gift_out_of_stock'],
                'address_changes': result['address_changes'],
                'bad_rows_count': len(bad_rows)
            },
            'issues': [
                {
                    'issue_id': i.issue_id,
                    'type': i.issue_type.value,
                    'order_id': i.order_id,
                    'sku': i.sku,
                    'signature_number': i.signature_number,
                    'description': i.description,
                    'source_data': i.source_data,
                    'reviewed': i.reviewed
                }
                for i in result['issues']
            ],
            'bad_rows': [
                {
                    'row_number': br.row_number,
                    'raw_data': br.raw_data,
                    'issues': br.issues,
                    'source_file': br.source_file
                }
                for br in bad_rows
            ],
            'traces': [
                {
                    'order_id': t.order_id,
                    'order': {
                        'order_id': t.order.order_id,
                        'customer': t.order.customer.name,
                        'status': t.order.status.value,
                        'items': [
                            {
                                'sku': item.sku,
                                'title': item.title,
                                'signature_number': item.signature_number,
                                'gifts': [
                                    {
                                        'name': gift.name,
                                        'status': gift.status.value
                                    }
                                    for gift in item.gifts
                                ]
                            }
                            for item in t.order.items
                        ]
                    } if t.order else None,
                    'issues_count': len(t.issues)
                }
                for t in traces
            ]
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
