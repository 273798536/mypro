from datetime import datetime
from typing import List, Dict, Optional
from collections import defaultdict

from .models import (
    PreSaleOrder,
    DepositRecord,
    BalanceRecord,
    ReconciliationItem,
    ReconciliationSummary,
    ExceptionType,
    OrderStatus,
    DataSource,
)


def _build_index(records, key_attr: str) -> Dict[str, List]:
    index = defaultdict(list)
    for record in records:
        key = getattr(record, key_attr)
        index[key].append(record)
    return index


def _amount_equal(a: float, b: float, epsilon: float = 0.01) -> bool:
    return abs(a - b) < epsilon


def _check_amount_match(
    item: ReconciliationItem,
    tolerance: float = 0.01,
) -> List[str]:
    problems = []
    
    if item.order and item.deposit:
        if not _amount_equal(item.order.deposit_amount, item.deposit.pay_amount, tolerance):
            problems.append(
                f"定金金额不符：订单约定{item.order.deposit_amount:.2f}元，实际支付{item.deposit.pay_amount:.2f}元，"
                f"差额{item.deposit.pay_amount - item.order.deposit_amount:+.2f}元"
            )
            item.exception_type = ExceptionType.DEPOSIT_MISMATCH
            item.add_problem_source(DataSource.ORDER)
            item.add_problem_source(DataSource.DEPOSIT)
    
    if item.order and item.balance:
        if not _amount_equal(item.order.balance_amount, item.balance.pay_amount, tolerance):
            problems.append(
                f"尾款金额不符：订单约定{item.order.balance_amount:.2f}元，实际支付{item.balance.pay_amount:.2f}元，"
                f"差额{item.balance.pay_amount - item.order.balance_amount:+.2f}元"
            )
            if item.exception_type == ExceptionType.NORMAL:
                item.exception_type = ExceptionType.BALANCE_MISMATCH
            item.add_problem_source(DataSource.ORDER)
            item.add_problem_source(DataSource.BALANCE)
    
    if item.order and item.deposit and item.balance:
        total_paid = item.deposit.pay_amount + item.balance.pay_amount
        if not _amount_equal(item.order.total_amount, total_paid, tolerance):
            problems.append(
                f"总金额不符：订单总额{item.order.total_amount:.2f}元，累计支付{total_paid:.2f}元，"
                f"差额{total_paid - item.order.total_amount:+.2f}元"
            )
            if item.exception_type == ExceptionType.NORMAL:
                item.exception_type = ExceptionType.AMOUNT_MISMATCH
            item.add_problem_source(DataSource.ORDER)
    
    return problems


def _check_missing_data(item: ReconciliationItem) -> List[str]:
    problems = []
    
    if not item.order:
        problems.append(
            f"缺失预售订单信息：定金流水/尾款支付有记录，但找不到对应的预售订单"
        )
        item.exception_type = ExceptionType.MISSING_ORDER
        if item.deposit:
            item.add_problem_source(DataSource.DEPOSIT)
        if item.balance:
            item.add_problem_source(DataSource.BALANCE)
        return problems
    
    if not item.deposit:
        problems.append(
            f"缺失定金流水：订单【{item.order.product_name}】约定定金{item.order.deposit_amount:.2f}元，但未找到支付记录"
        )
        if item.exception_type == ExceptionType.NORMAL:
            item.exception_type = ExceptionType.MISSING_DEPOSIT
        item.add_problem_source(DataSource.ORDER)
        item.add_problem_source(DataSource.DEPOSIT)
    
    if item.order.status not in [
        OrderStatus.DEPOSIT_NOT_REFUND,
        OrderStatus.BALANCE_TIMEOUT,
        OrderStatus.CANCELLED,
        OrderStatus.PENDING_DEPOSIT,
    ]:
        if not item.balance:
            problems.append(
                f"缺失尾款支付：订单【{item.order.product_name}】约定尾款{item.order.balance_amount:.2f}元，但未找到支付记录"
            )
            if item.exception_type == ExceptionType.NORMAL:
                item.exception_type = ExceptionType.MISSING_BALANCE
            item.add_problem_source(DataSource.ORDER)
            item.add_problem_source(DataSource.BALANCE)
    
    return problems


def _check_order_status(item: ReconciliationItem, current_time: datetime) -> List[str]:
    problems = []
    
    if not item.order:
        return problems
    
    order = item.order
    
    if order.status == OrderStatus.DEPOSIT_NOT_REFUND:
        problems.append(
            f"【定金不退】订单【{order.product_name}】买家未支付尾款，按规则定金{order.deposit_amount:.2f}元不予退还。"
            f"请核查：尾款截止时间{order.balance_deadline.strftime('%Y-%m-%d %H:%M:%S') if order.balance_deadline else '未设置'}，"
            f"订单备注：{order.remark if order.remark else '无'}"
        )
        item.exception_type = ExceptionType.DEPOSIT_NOT_REFUND
        item.add_problem_source(DataSource.ORDER)
        if item.deposit:
            item.add_problem_source(DataSource.DEPOSIT)
    
    elif order.status == OrderStatus.BALANCE_TIMEOUT:
        problems.append(
            f"【尾款超时】订单【{order.product_name}】买家未在截止时间前支付尾款。"
            f"尾款截止时间：{order.balance_deadline.strftime('%Y-%m-%d %H:%M:%S') if order.balance_deadline else '未设置'}，"
            f"当前核查时间：{current_time.strftime('%Y-%m-%d %H:%M:%S')}"
        )
        item.exception_type = ExceptionType.BALANCE_TIMEOUT
        item.add_problem_source(DataSource.ORDER)
        if item.deposit:
            item.add_problem_source(DataSource.DEPOSIT)
        if not item.balance:
            item.add_problem_source(DataSource.BALANCE)
    
    return problems


def _check_balance_timeout(
    item: ReconciliationItem,
    current_time: datetime,
    balance_grace_hours: int = 0,
) -> List[str]:
    problems = []
    
    if not item.order or not item.order.balance_deadline:
        return problems
    
    if item.order.status in [OrderStatus.DEPOSIT_NOT_REFUND, OrderStatus.BALANCE_TIMEOUT, OrderStatus.CANCELLED]:
        return problems
    
    if item.balance and item.balance.pay_time:
        if item.balance.pay_time > item.order.balance_deadline:
            grace_seconds = balance_grace_hours * 3600
            delay_seconds = (item.balance.pay_time - item.order.balance_deadline).total_seconds()
            if delay_seconds > grace_seconds:
                hours, remainder = divmod(delay_seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                problems.append(
                    f"【尾款超时支付】订单【{item.order.product_name}】实际支付时间晚于截止时间。"
                    f"截止时间：{item.order.balance_deadline.strftime('%Y-%m-%d %H:%M:%S')}，"
                    f"实际支付：{item.balance.pay_time.strftime('%Y-%m-%d %H:%M:%S')}，"
                    f"超时：{int(hours)}小时{int(minutes)}分钟"
                )
                if item.exception_type == ExceptionType.NORMAL:
                    item.exception_type = ExceptionType.BALANCE_TIMEOUT
                item.add_problem_source(DataSource.ORDER)
                item.add_problem_source(DataSource.BALANCE)
    else:
        if current_time > item.order.balance_deadline:
            if item.deposit and item.order.status == OrderStatus.DEPOSIT_PAID:
                delay_seconds = (current_time - item.order.balance_deadline).total_seconds()
                hours, remainder = divmod(delay_seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                problems.append(
                    f"【尾款已超时未付】订单【{item.order.product_name}】已超过尾款支付截止时间但未支付尾款。"
                    f"截止时间：{item.order.balance_deadline.strftime('%Y-%m-%d %H:%M:%S')}，"
                    f"当前时间：{current_time.strftime('%Y-%m-%d %H:%M:%S')}，"
                    f"已超时：{int(hours)}小时{int(minutes)}分钟，"
                    f"定金{item.order.deposit_amount:.2f}元按规则可能不予退还"
                )
                if item.exception_type == ExceptionType.NORMAL:
                    item.exception_type = ExceptionType.BALANCE_TIMEOUT
                item.add_problem_source(DataSource.ORDER)
                item.add_problem_source(DataSource.BALANCE)
    
    return problems


def reconcile(
    orders: List[PreSaleOrder],
    deposits: List[DepositRecord],
    balances: List[BalanceRecord],
    balance_grace_hours: int = 0,
    current_time: Optional[datetime] = None,
) -> ReconciliationSummary:
    if current_time is None:
        current_time = datetime.now()
    
    deposit_index = _build_index(deposits, "order_no")
    balance_index = _build_index(balances, "order_no")
    
    all_order_nos = set()
    all_order_nos.update(order.order_no for order in orders)
    all_order_nos.update(deposit.order_no for deposit in deposits)
    all_order_nos.update(balance.order_no for balance in balances)
    
    order_map = {order.order_no: order for order in orders}
    
    summary = ReconciliationSummary()
    summary.total_orders = len(all_order_nos)
    summary.total_order_amount = sum(order.total_amount for order in orders)
    summary.total_deposit_amount = sum(deposit.pay_amount for deposit in deposits)
    summary.total_balance_amount = sum(balance.pay_amount for balance in balances)
    
    for order_no in sorted(all_order_nos):
        order = order_map.get(order_no)
        deposit_list = deposit_index.get(order_no, [])
        balance_list = balance_index.get(order_no, [])
        
        deposit = deposit_list[0] if deposit_list else None
        balance = balance_list[0] if balance_list else None
        
        item = ReconciliationItem(
            order_no=order_no,
            order=order,
            deposit=deposit,
            balance=balance,
            reconcile_time=current_time,
        )
        
        all_problems = []
        
        all_problems.extend(_check_order_status(item, current_time))
        all_problems.extend(_check_missing_data(item))
        all_problems.extend(_check_amount_match(item))
        all_problems.extend(_check_balance_timeout(item, current_time, balance_grace_hours))
        
        if len(deposit_list) > 1:
            all_problems.append(
                f"订单存在{len(deposit_list)}条定金流水记录，请核查是否重复支付"
            )
            item.add_problem_source(DataSource.DEPOSIT)
        
        if len(balance_list) > 1:
            all_problems.append(
                f"订单存在{len(balance_list)}条尾款支付记录，请核查是否重复支付"
            )
            item.add_problem_source(DataSource.BALANCE)
        
        if all_problems:
            item.is_matched = False
            item.exception_desc = "；".join(all_problems)
            summary.exception_count += 1
            summary.exception_details.append(item)
            
            if item.exception_type == ExceptionType.DEPOSIT_NOT_REFUND:
                summary.deposit_not_refund_count += 1
            elif item.exception_type == ExceptionType.BALANCE_TIMEOUT:
                summary.balance_timeout_count += 1
            elif item.exception_type in [ExceptionType.DEPOSIT_MISMATCH, ExceptionType.BALANCE_MISMATCH, ExceptionType.AMOUNT_MISMATCH]:
                summary.amount_mismatch_count += 1
            elif item.exception_type in [ExceptionType.MISSING_DEPOSIT, ExceptionType.MISSING_BALANCE, ExceptionType.MISSING_ORDER]:
                summary.missing_data_count += 1
        else:
            item.is_matched = True
            item.exception_type = ExceptionType.NORMAL
            item.exception_desc = "对账通过，三方数据一致"
            summary.matched_count += 1
        
        summary.all_results.append(item)
    
    return summary
