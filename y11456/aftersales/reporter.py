import os
import json
from datetime import datetime
from typing import List, Dict, Tuple
import pandas as pd
from .models import (
    get_batch, get_aftersales_orders, get_batch_stats,
    get_source_files, get_check_results, get_adjustments,
    get_export_records, get_raw_records_by_batch, freeze_order,
    mark_exported, get_order_by_id, get_failed_records_by_batch, get_failed_stats
)
from .checker import split_by_problem_type, get_failed_details


class ReportError(Exception):
    pass


def generate_report(batch_no: str) -> Dict:
    batch = get_batch(batch_no)
    if not batch:
        raise ReportError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    stats = get_batch_stats(batch_id)
    source_files = get_source_files(batch_id)
    split_orders = split_by_problem_type(batch_no)
    failed_details = get_failed_details(batch_no)
    import_failed_records = get_failed_records_by_batch(batch_id)
    import_failed_stats = get_failed_stats(batch_id)
    
    total_amount = 0
    passed_orders = get_aftersales_orders(batch_id, status='passed')
    for order in passed_orders:
        total_amount += order.get('combined_refund_amount', 0) or 0
    
    report = {
        'batch_no': batch_no,
        'created_at': batch['created_at'],
        'description': batch.get('description', ''),
        'statistics': {
            'total_orders': stats.get('total', 0),
            'passed_orders': stats.get('passed', 0),
            'failed_orders': stats.get('failed', 0),
            'manual_orders': stats.get('manual', 0),
            'frozen_orders': stats.get('frozen', 0),
            'exported_orders': stats.get('exported', 0),
            'raw_records': stats.get('raw_records', 0),
            'import_failed': import_failed_stats.get('total', 0),
            'total_refund_amount': round(total_amount, 2)
        },
        'source_files': [
            {
                'file_type': f['file_type'],
                'file_name': f['file_name'],
                'imported_at': f['imported_at'],
                'total_rows': f['total_rows']
            }
            for f in source_files
        ],
        'problem_type_distribution': {
            '少发': len(split_orders['少发']),
            '坏品': len(split_orders['坏品']),
            '错发': len(split_orders['错发']),
            '其他': len(split_orders['其他'])
        },
        'failed_orders': failed_details,
        'import_failed_stats': import_failed_stats,
        'import_failed_records': import_failed_records
    }
    
    return report


def format_report_text(report: Dict) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("          社区团购售后巡检报告")
    lines.append("=" * 60)
    lines.append(f"批次号: {report['batch_no']}")
    lines.append(f"创建时间: {report['created_at']}")
    if report['description']:
        lines.append(f"备注: {report['description']}")
    lines.append("")
    
    lines.append("-" * 40)
    lines.append("【统计概览】")
    lines.append("-" * 40)
    stats = report['statistics']
    lines.append(f"  售后订单总数: {stats['total_orders']}")
    lines.append(f"  通过核验: {stats['passed_orders']}")
    lines.append(f"  核验失败: {stats['failed_orders']}")
    lines.append(f"  人工改判: {stats['manual_orders']}")
    lines.append(f"  已冻结: {stats['frozen_orders']}")
    lines.append(f"  已导出: {stats['exported_orders']}")
    lines.append(f"  原始记录数: {stats['raw_records']}")
    lines.append(f"  导入失败: {stats['import_failed']}")
    lines.append(f"  总退款金额: ¥{stats['total_refund_amount']:.2f}")
    lines.append("")
    
    lines.append("-" * 40)
    lines.append("【来源文件】")
    lines.append("-" * 40)
    for sf in report['source_files']:
        lines.append(f"  [{sf['file_type']}] {sf['file_name']} ({sf['total_rows']}行)")
    lines.append("")
    
    lines.append("-" * 40)
    lines.append("【问题类型分布】")
    lines.append("-" * 40)
    dist = report['problem_type_distribution']
    for ptype, count in dist.items():
        lines.append(f"  {ptype}: {count} 单")
    lines.append("")
    
    if report['failed_orders']:
        lines.append("-" * 40)
        lines.append(f"【核验失败清单】({len(report['failed_orders'])} 单)")
        lines.append("-" * 40)
        for idx, order in enumerate(report['failed_orders'], 1):
            lines.append(f"{idx}. 订单号: {order['order_no']}")
            lines.append(f"   商品: {order['sku_code']} - {order['sku_name']}")
            lines.append(f"   金额: 团长¥{order['leader_amount']} / 仓库¥{order['warehouse_amount']}")
            lines.append(f"   问题类型: {order['problem_type']}")
            if order['source_rows']:
                src_info = ", ".join([
                    f"{s['source']}第{s['row_no']}行" 
                    for s in order['source_rows']
                ])
                lines.append(f"   原始行号: {src_info}")
            lines.append("")
    
    if report.get('import_failed_records'):
        lines.append("-" * 40)
        lines.append(f"【导入失败清单】({len(report['import_failed_records'])} 条)")
        lines.append("-" * 40)
        for idx, record in enumerate(report['import_failed_records'], 1):
            lines.append(f"{idx}. 来源: {record.get('file_name', '未知')} 第{record['original_row_no']}行")
            lines.append(f"   类型: {record['source_type']}")
            lines.append(f"   订单号: {record.get('order_no', '(空)') or '(空)'}")
            lines.append(f"   商品编码: {record.get('sku_code', '(空)') or '(空)'}")
            lines.append(f"   失败原因: {record['error_message']}")
            lines.append("")
    
    return "\n".join(lines)


def mask_sensitive_data(value: str, data_type: str = 'default') -> str:
    if not value:
        return value
    
    value_str = str(value)
    
    if data_type == 'order_no':
        if len(value_str) > 6:
            return value_str[:3] + '***' + value_str[-3:]
        return '***'
    elif data_type == 'remark':
        if len(value_str) > 10:
            return value_str[:5] + '...' + value_str[-5:]
        return value_str
    elif data_type == 'receipt':
        if len(value_str) > 12:
            return value_str[:6] + '***' + value_str[-6:]
        return '***'
    else:
        return value_str


def export_to_excel(batch_no: str, output_dir: str, operator: str = None, 
                    mask_sensitive: bool = False) -> Dict:
    batch = get_batch(batch_no)
    if not batch:
        raise ReportError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    mask_suffix = '_masked' if mask_sensitive else ''
    base_filename = f"aftersales_{batch_no}_{timestamp}{mask_suffix}"
    
    split_orders = split_by_problem_type(batch_no)
    failed_orders = get_failed_details(batch_no)
    
    exported_files = {}
    all_exported_ids = []
    
    for problem_type, orders in split_orders.items():
        if not orders:
            continue
        
        data = []
        for order in orders:
            order_id = order['id']
            all_exported_ids.append(order_id)
            
            check_results = get_check_results(order_id)
            adjustments = get_adjustments(order_id)
            
            order_no = order['order_no']
            leader_remark = order.get('leader_remark', '')
            warehouse_remark = order.get('warehouse_remark', '')
            user_remark = order.get('user_remark', '')
            external_receipt = order.get('external_receipt', '')
            
            if mask_sensitive:
                order_no = mask_sensitive_data(order_no, 'order_no')
                leader_remark = mask_sensitive_data(leader_remark, 'remark')
                warehouse_remark = mask_sensitive_data(warehouse_remark, 'remark')
                user_remark = mask_sensitive_data(user_remark, 'remark')
                external_receipt = mask_sensitive_data(external_receipt, 'receipt')
            
            data.append({
                '订单号': order_no,
                '商品编码': order['sku_code'],
                '商品名称': order.get('sku_name', ''),
                '问题类型': problem_type,
                '退款金额': order.get('combined_refund_amount', 0),
                '团长退款金额': order.get('leader_refund_amount', 0),
                '仓库复核金额': order.get('warehouse_refund_amount', 0),
                '团长备注': leader_remark,
                '仓库备注': warehouse_remark,
                '用户备注': user_remark,
                '外部回执': external_receipt,
                '核验状态': order.get('status', ''),
                '核验结论': " | ".join([c['detail'] for c in check_results]),
                '改判记录': " | ".join([
                    f"{a['adjust_type']}: {a['old_value']} -> {a['new_value']}"
                    for a in adjustments
                ]),
                '是否冻结': '是' if order.get('is_frozen') else '否'
            })
        
        df = pd.DataFrame(data)
        filename = f"{base_filename}_{problem_type}.xlsx"
        filepath = os.path.join(output_dir, filename)
        df.to_excel(filepath, index=False, engine='openpyxl')
        exported_files[problem_type] = filepath
    
    if failed_orders:
        data = []
        for order in failed_orders:
            order_no = order['order_no']
            if mask_sensitive:
                order_no = mask_sensitive_data(order_no, 'order_no')
            
            data.append({
                '订单号': order_no,
                '商品编码': order['sku_code'],
                '商品名称': order.get('sku_name', ''),
                '问题类型': order['problem_type'],
                '团长退款金额': order.get('leader_amount', 0),
                '仓库复核金额': order.get('warehouse_amount', 0),
                '原始来源': ", ".join([
                    f"{s['source']}第{s['row_no']}行" 
                    for s in order['source_rows']
                ]),
                '是否冻结': '是' if order.get('is_frozen') else '否'
            })
        
        df = pd.DataFrame(data)
        filename = f"{base_filename}_待处理.xlsx"
        filepath = os.path.join(output_dir, filename)
        df.to_excel(filepath, index=False, engine='openpyxl')
        exported_files['待处理'] = filepath
    
    main_file = exported_files.get('少发') or exported_files.get('坏品') or list(exported_files.values())[0]
    mark_exported(all_exported_ids, 'excel', main_file, batch_id, operator)
    
    return {
        'batch_no': batch_no,
        'exported_at': datetime.now().isoformat(),
        'total_exported': len(all_exported_ids),
        'files': exported_files
    }


def freeze_failed_orders(batch_no: str, operator: str = None) -> Tuple[int, List[int]]:
    batch = get_batch(batch_no)
    if not batch:
        raise ReportError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    failed_orders = get_aftersales_orders(batch_id, status='failed')
    
    frozen_count = 0
    frozen_ids = []
    
    for order in failed_orders:
        if not order.get('is_frozen'):
            freeze_order(order['id'], operator)
            frozen_count += 1
            frozen_ids.append(order['id'])
    
    return frozen_count, frozen_ids


def get_order_history(order_id: int) -> Dict:
    order = get_order_by_id(order_id)
    if not order:
        raise ReportError(f"订单不存在: {order_id}")
    
    check_results = get_check_results(order_id)
    adjustments = get_adjustments(order_id)
    
    return {
        'order': order,
        'check_results': check_results,
        'adjustments': adjustments
    }
