"""核心引擎：开放日校验、份额锁定、顺延判定、撤单回滚。"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from . import models
from .models import (
    ORDER_STATUS_PENDING, ORDER_STATUS_LOCKED, ORDER_STATUS_PROCESSING,
    ORDER_STATUS_DEFERRED, ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELLED,
    ORDER_STATUS_REJECTED,
)

LARGE_REDEMPTION_RATIO = 0.1


@dataclass
class Alert:
    level: str
    code: str
    message: str
    order_no: str

    def format(self) -> str:
        prefix = {"WARNING": "[警告]", "ERROR": "[错误]", "INFO": "[提示]"}.get(self.level, "[信息]")
        return f"{prefix} {self.order_no} {self.code}: {self.message}"


@dataclass
class ProcessResult:
    order_no: str
    final_status: str
    alerts: list[Alert] = field(default_factory=list)
    details: str = ""


# ---------------------------------------------------------------------------
# 开放日校验
# ---------------------------------------------------------------------------

def validate_open_day(order: models.RedemptionOrder) -> list[Alert]:
    alerts: list[Alert] = []
    if not models.is_open_day(order.product_code, order.apply_date):
        next_day = models.next_open_day(order.product_code, order.apply_date)
        msg = f"非开放日申请（{order.apply_date}）"
        if next_day:
            msg += f"，下个开放日：{next_day}"
        alerts.append(Alert("ERROR", "NON_OPEN_DAY", msg, order.order_no))
    return alerts


# ---------------------------------------------------------------------------
# 巨额赎回判定
# ---------------------------------------------------------------------------

def check_large_redemption(order: models.RedemptionOrder) -> list[Alert]:
    alerts: list[Alert] = []
    if order.is_large_redemption < 0:
        return alerts
    bal = models.get_share_balance(order.product_code, order.customer_id)
    if bal and bal.balance > 0:
        ratio = order.amount / bal.balance
        if ratio >= LARGE_REDEMPTION_RATIO:
            alerts.append(Alert(
                "WARNING", "LARGE_REDEMPTION",
                f"巨额赎回（占余额 {ratio:.1%}，阈值 {LARGE_REDEMPTION_RATIO:.0%}），"
                f"可能顺延至下一开放日",
                order.order_no,
            ))
    return alerts


# ---------------------------------------------------------------------------
# 份额锁定
# ---------------------------------------------------------------------------

def try_lock_shares(order: models.RedemptionOrder) -> list[Alert]:
    alerts: list[Alert] = []
    available = models.get_available_shares(order.product_code, order.customer_id)
    if available < order.amount:
        alerts.append(Alert(
            "ERROR", "INSUFFICIENT_SHARES",
            f"可用份额不足（可用 {available:.4f}，申请 {order.amount:.4f}）",
            order.order_no,
        ))
        return alerts
    ok = models.lock_shares(order.product_code, order.customer_id, order.amount)
    if not ok:
        alerts.append(Alert("ERROR", "LOCK_FAILED", "份额锁定失败", order.order_no))
    return alerts


# ---------------------------------------------------------------------------
# 单订单处理
# ---------------------------------------------------------------------------

def process_order(order_no: str) -> ProcessResult:
    order = models.get_order(order_no)
    if not order:
        return ProcessResult(order_no, "NOT_FOUND", alerts=[
            Alert("ERROR", "ORDER_NOT_FOUND", "赎回单不存在", order_no)
        ])

    all_alerts: list[Alert] = []

    open_day_alerts = validate_open_day(order)
    all_alerts.extend(open_day_alerts)

    if any(a.level == "ERROR" for a in open_day_alerts):
        models.update_order_status(
            order_no, ORDER_STATUS_REJECTED,
            is_open_day=0,
        )
        return ProcessResult(
            order_no, ORDER_STATUS_REJECTED, alerts=all_alerts,
            details="非开放日，申请被拒绝",
        )

    large_alerts = check_large_redemption(order)
    all_alerts.extend(large_alerts)

    has_large = any(a.code == "LARGE_REDEMPTION" for a in large_alerts)
    if has_large:
        next_day = models.next_open_day(order.product_code, order.apply_date)
        models.update_order_status(
            order_no, ORDER_STATUS_DEFERRED,
            is_large_redemption=1,
            defer_count=1,
            next_process_date=next_day,
        )
        return ProcessResult(
            order_no, ORDER_STATUS_DEFERRED, alerts=all_alerts,
            details=f"巨额赎回顺延至 {next_day}",
        )

    lock_alerts = try_lock_shares(order)
    all_alerts.extend(lock_alerts)

    if any(a.level == "ERROR" for a in lock_alerts):
        models.update_order_status(
            order_no, ORDER_STATUS_REJECTED,
        )
        return ProcessResult(
            order_no, ORDER_STATUS_REJECTED, alerts=all_alerts,
            details="份额锁定失败",
        )

    models.update_order_status(order_no, ORDER_STATUS_LOCKED)
    return ProcessResult(
        order_no, ORDER_STATUS_LOCKED, alerts=all_alerts,
        details="份额已锁定，等待到账",
    )


# ---------------------------------------------------------------------------
# 撤单回滚
# ---------------------------------------------------------------------------

def cancel_order(order_no: str, cancel_date: str, source: str, reason: str | None = None) -> ProcessResult:
    order = models.get_order(order_no)
    if not order:
        return ProcessResult(order_no, "NOT_FOUND", alerts=[
            Alert("ERROR", "ORDER_NOT_FOUND", "赎回单不存在", order_no)
        ])

    alerts: list[Alert] = []

    if order.status == ORDER_STATUS_COMPLETED:
        alerts.append(Alert(
            "WARNING", "CANCEL_AFTER_COMPLETE",
            f"已完成的赎回单无法撤单（当前状态：{order.status}）",
            order_no,
        ))
        return ProcessResult(
            order_no, order.status, alerts=alerts,
            details="已完成订单不允许撤单",
        )

    if order.status in (ORDER_STATUS_LOCKED, ORDER_STATUS_DEFERRED, ORDER_STATUS_PROCESSING):
        unlocked = models.unlock_shares(order.product_code, order.customer_id, order.amount)
        if not unlocked:
            alerts.append(Alert(
                "WARNING", "UNLOCK_PARTIAL",
                f"撤单回滚：可能存在部分份额已被扣划，仅回滚已锁定部分",
                order_no,
            ))

    models.add_cancellation(order_no, cancel_date, source, reason)
    models.update_order_status(order_no, ORDER_STATUS_CANCELLED)

    alerts.append(Alert(
        "INFO", "CANCELLED",
        f"撤单成功（原状态：{order.status}），份额已回滚",
        order_no,
    ))

    return ProcessResult(
        order_no, ORDER_STATUS_CANCELLED, alerts=alerts,
        details="撤单成功，份额已回滚",
    )


# ---------------------------------------------------------------------------
# 顺延订单处理
# ---------------------------------------------------------------------------

def process_deferred_orders(current_date: str) -> list[ProcessResult]:
    results: list[ProcessResult] = []
    orders = models.list_orders(ORDER_STATUS_DEFERRED)
    for order in orders:
        if order.next_process_date and order.next_process_date <= current_date:
            if models.is_open_day(order.product_code, current_date):
                models.update_order_status(
                    order.order_no, ORDER_STATUS_PENDING,
                    is_large_redemption=-1, is_open_day=1,
                    next_process_date=None, defer_count=order.defer_count,
                )
                r = process_order(order.order_no)
                results.append(r)
            else:
                next_day = models.next_open_day(order.product_code, current_date)
                models.update_order_status(
                    order.order_no, ORDER_STATUS_DEFERRED,
                    defer_count=order.defer_count + 1,
                    next_process_date=next_day,
                )
                results.append(ProcessResult(
                    order.order_no, ORDER_STATUS_DEFERRED,
                    alerts=[Alert(
                        "WARNING", "STILL_DEFERRED",
                        f"顺延中（已顺延 {order.defer_count + 1} 次），下个开放日：{next_day}",
                        order.order_no,
                    )],
                    details=f"仍需顺延至 {next_day}",
                ))
    return results


# ---------------------------------------------------------------------------
# 到账确认
# ---------------------------------------------------------------------------

def confirm_arrival(order_no: str, arrive_date: str, arrive_amount: float, source: str) -> ProcessResult:
    order = models.get_order(order_no)
    if not order:
        return ProcessResult(order_no, "NOT_FOUND", alerts=[
            Alert("ERROR", "ORDER_NOT_FOUND", "赎回单不存在", order_no)
        ])

    alerts: list[Alert] = []

    if order.status not in (ORDER_STATUS_LOCKED, ORDER_STATUS_PROCESSING):
        alerts.append(Alert(
            "WARNING", "UNEXPECTED_STATUS",
            f"订单当前状态为 {order.status}，通常应在 LOCKED/PROCESSING 时到账",
            order_no,
        ))

    if arrive_amount != order.amount:
        alerts.append(Alert(
            "WARNING", "AMOUNT_MISMATCH",
            f"到账金额（{arrive_amount:.4f}）与申请金额（{order.amount:.4f}）不一致",
            order_no,
        ))

    models.deduct_shares(order.product_code, order.customer_id, min(arrive_amount, order.amount))
    models.add_arrival_report(order_no, arrive_date, arrive_amount, source)
    models.update_order_status(order_no, ORDER_STATUS_COMPLETED)

    return ProcessResult(
        order_no, ORDER_STATUS_COMPLETED, alerts=alerts,
        details=f"到账确认：{arrive_amount:.4f}，日期 {arrive_date}",
    )


# ---------------------------------------------------------------------------
# 批量处理
# ---------------------------------------------------------------------------

def process_all_pending() -> list[ProcessResult]:
    results: list[ProcessResult] = []
    for order in models.list_orders(ORDER_STATUS_PENDING):
        results.append(process_order(order.order_no))
    return results


def process_all(current_date: str | None = None) -> list[ProcessResult]:
    if current_date is None:
        current_date = datetime.now().strftime("%Y-%m-%d")
    results = process_all_pending()
    results.extend(process_deferred_orders(current_date))
    return results
