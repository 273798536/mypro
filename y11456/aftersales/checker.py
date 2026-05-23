from typing import List, Dict, Tuple, Optional
from .models import (
    get_batch, get_aftersales_orders, add_check_result, 
    upsert_aftersales_order, get_order_by_id, add_adjustment,
    get_raw_records_by_batch
)


class CheckError(Exception):
    pass


AMOUNT_TOLERANCE = 0.01


def determine_final_problem_type(order: Dict) -> str:
    problem_type = order.get('problem_type', '')
    
    if '|' in problem_type:
        types = set(problem_type.split('|'))
        
        if '少发' in types and '坏品' in types:
            warehouse_remark = order.get('warehouse_remark', '')
            leader_remark = order.get('leader_remark', '')
            user_remark = order.get('user_remark', '')
            
            all_remarks = f"{warehouse_remark}|{leader_remark}|{user_remark}".lower()
            
            if any(k in all_remarks for k in ['少发', '漏发', '缺少']):
                if any(k in all_remarks for k in ['坏品', '破损', '变质']):
                    return '混合问题'
                return '少发'
            elif any(k in all_remarks for k in ['坏品', '破损', '变质']):
                return '坏品'
            
            return '待确认'
        
        if '少发' in types:
            return '少发'
        if '坏品' in types:
            return '坏品'
        if '错发' in types:
            return '错发'
        
        return list(types)[0]
    
    return problem_type if problem_type else '未分类'


def check_amount_consistency(order: Dict) -> Tuple[bool, str]:
    leader_amount = order.get('leader_refund_amount', 0) or 0
    warehouse_amount = order.get('warehouse_refund_amount', 0) or 0
    combined_amount = order.get('combined_refund_amount', 0) or 0
    
    if leader_amount == 0 and warehouse_amount == 0:
        return False, '双源金额均为0，需确认'
    
    if leader_amount > 0 and warehouse_amount > 0:
        diff = abs(leader_amount - warehouse_amount)
        if diff > AMOUNT_TOLERANCE:
            return False, f'金额不一致 - 团长:{leader_amount} vs 仓库:{warehouse_amount}'
    
    if leader_amount > 0 and warehouse_amount == 0:
        return True, '仅有团长退款记录，按此执行'
    
    if warehouse_amount > 0 and leader_amount == 0:
        return True, '仅有仓库复核记录，按此执行'
    
    return True, '金额一致'


def check_problem_type(order: Dict) -> Tuple[bool, str]:
    final_type = determine_final_problem_type(order)
    original_type = order.get('problem_type', '')
    
    if final_type == '待确认':
        return False, f'问题类型需人工确认: 原始=[{original_type}]'
    
    if '|' in original_type:
        return True, f'多源合并判定: {original_type} -> {final_type}'
    
    return True, f'问题类型: {final_type}'


def check_has_evidence(order: Dict) -> Tuple[bool, str]:
    warehouse_remark = order.get('warehouse_remark', '')
    leader_remark = order.get('leader_remark', '')
    user_remark = order.get('user_remark', '')
    external_receipt = order.get('external_receipt', '')
    
    evidences = []
    if warehouse_remark:
        evidences.append('仓库备注')
    if leader_remark:
        evidences.append('团长备注')
    if user_remark:
        evidences.append('用户备注')
    if external_receipt:
        evidences.append('外部回执')
    
    if not evidences:
        return False, '无任何佐证材料，需补充'
    
    return True, f'已有佐证: {", ".join(evidences)}'


def run_checks(batch_no: str) -> Tuple[int, int, List[Dict]]:
    batch = get_batch(batch_no)
    if not batch:
        raise CheckError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    orders = get_aftersales_orders(batch_id)
    
    passed_count = 0
    failed_count = 0
    failed_orders = []
    
    for order in orders:
        order_id = order['id']
        order_status = 'passed'
        failures = []
        
        amount_ok, amount_detail = check_amount_consistency(order)
        add_check_result(order_id, 'amount', 'pass' if amount_ok else 'fail', amount_detail)
        if not amount_ok:
            failures.append(amount_detail)
            order_status = 'failed'
        
        type_ok, type_detail = check_problem_type(order)
        add_check_result(order_id, 'problem_type', 'pass' if type_ok else 'fail', type_detail)
        if not type_ok:
            failures.append(type_detail)
            order_status = 'failed'
        
        evidence_ok, evidence_detail = check_has_evidence(order)
        add_check_result(order_id, 'evidence', 'pass' if evidence_ok else 'fail', evidence_detail)
        if not evidence_ok:
            failures.append(evidence_detail)
            order_status = 'failed'
        
        final_problem_type = determine_final_problem_type(order)
        
        upsert_aftersales_order(
            batch_id=batch_id,
            order_no=order['order_no'],
            sku_code=order['sku_code'],
            status=order_status,
            final_problem_type=final_problem_type
        )
        
        if order_status == 'passed':
            passed_count += 1
        else:
            failed_count += 1
            failed_orders.append({
                'order_id': order_id,
                'order_no': order['order_no'],
                'sku_code': order['sku_code'],
                'sku_name': order.get('sku_name', ''),
                'failures': failures,
                'leader_amount': order.get('leader_refund_amount', 0),
                'warehouse_amount': order.get('warehouse_refund_amount', 0),
                'problem_type': order.get('problem_type', '')
            })
    
    return passed_count, failed_count, failed_orders


def manual_adjust(order_id: int, field: str, value: str, operator: str = None, 
                  reason: str = None) -> bool:
    order = get_order_by_id(order_id)
    if not order:
        raise CheckError(f"订单不存在: {order_id}")
    
    if order.get('is_exported'):
        raise CheckError("订单已导出，无法修改")
    
    old_value = str(order.get(field, ''))
    
    update_kwargs = {}
    
    if field == 'combined_refund_amount':
        update_kwargs[field] = float(value)
    elif field == 'final_problem_type':
        update_kwargs[field] = value
    elif field == 'status':
        update_kwargs[field] = value
    else:
        raise CheckError(f"不支持修改的字段: {field}")
    
    upsert_aftersales_order(
        batch_id=order['batch_id'],
        order_no=order['order_no'],
        sku_code=order['sku_code'],
        **update_kwargs
    )
    
    add_adjustment(
        order_id=order_id,
        adjust_type=f'update_{field}',
        old_value=old_value,
        new_value=value,
        operator=operator,
        reason=reason or '人工改判'
    )
    
    return True


def split_by_problem_type(batch_no: str) -> Dict[str, List[Dict]]:
    batch = get_batch(batch_no)
    if not batch:
        raise CheckError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    orders = get_aftersales_orders(batch_id, status='passed')
    
    result = {
        '少发': [],
        '坏品': [],
        '错发': [],
        '其他': []
    }
    
    for order in orders:
        final_type = order.get('final_problem_type', '')
        if final_type == '少发':
            result['少发'].append(order)
        elif final_type == '坏品':
            result['坏品'].append(order)
        elif final_type == '错发':
            result['错发'].append(order)
        else:
            result['其他'].append(order)
    
    return result


def get_failed_details(batch_no: str) -> List[Dict]:
    batch = get_batch(batch_no)
    if not batch:
        raise CheckError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    failed_orders = get_aftersales_orders(batch_id, status='failed')
    
    raw_records = get_raw_records_by_batch(batch_id)
    
    raw_map = {}
    for rec in raw_records:
        key = (rec.get('order_no', ''), rec.get('sku_code', ''))
        if key not in raw_map:
            raw_map[key] = []
        raw_map[key].append({
            'source': rec.get('source_type'),
            'row_no': rec.get('original_row_no'),
            'file': rec.get('file_name')
        })
    
    result = []
    for order in failed_orders:
        key = (order.get('order_no', ''), order.get('sku_code', ''))
        result.append({
            'order_id': order['id'],
            'order_no': order['order_no'],
            'sku_code': order['sku_code'],
            'sku_name': order.get('sku_name', ''),
            'leader_amount': order.get('leader_refund_amount', 0),
            'warehouse_amount': order.get('warehouse_refund_amount', 0),
            'combined_amount': order.get('combined_refund_amount', 0),
            'problem_type': order.get('problem_type', ''),
            'final_problem_type': order.get('final_problem_type', ''),
            'source_rows': raw_map.get(key, []),
            'is_frozen': order.get('is_frozen', 0)
        })
    
    return result
