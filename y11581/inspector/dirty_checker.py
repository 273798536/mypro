from typing import Dict, List, Tuple, Any
from datetime import datetime
import json


class DirtyType:
    MISSING_FIELD = "missing_field"
    CROSS_DATE = "cross_date"
    NAME_CHANGE = "name_change"
    AMOUNT_CONFLICT = "amount_conflict"
    QUANTITY_CONFLICT = "quantity_conflict"
    INVALID_FORMAT = "invalid_format"


DIRTY_TYPE_NAMES = {
    DirtyType.MISSING_FIELD: "缺字段",
    DirtyType.CROSS_DATE: "跨日",
    DirtyType.NAME_CHANGE: "改名",
    DirtyType.AMOUNT_CONFLICT: "金额冲突",
    DirtyType.QUANTITY_CONFLICT: "数量冲突",
    DirtyType.INVALID_FORMAT: "格式无效",
}


def check_missing_fields(row: Dict, required_fields: List[str]) -> Tuple[bool, List[str]]:
    missing = []
    for field in required_fields:
        value = row.get(field)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            missing.append(field)
    return len(missing) > 0, missing


def parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d",
            "%m/%d/%Y %H:%M",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value.strip(), fmt)
            except (ValueError, AttributeError):
                continue
    return None


def check_cross_date(transaction_time: datetime, business_date: datetime = None) -> Tuple[bool, str]:
    if transaction_time is None:
        return False, ""
    if business_date is None:
        business_date = transaction_time.date()
    else:
        business_date = business_date.date() if isinstance(business_date, datetime) else business_date
    tx_date = transaction_time.date()
    if tx_date != business_date:
        return True, f"交易日期{tx_date}与业务日期{business_date}不一致"
    return False, ""


def check_name_change(current_name: str, previous_names: List[str]) -> Tuple[bool, str]:
    if not current_name or not previous_names:
        return False, ""
    current_clean = current_name.strip() if current_name else ""
    for prev in previous_names:
        if prev and prev.strip() != current_clean:
            return True, f"会员名称从'{prev}'变更为'{current_name}'"
    return False, ""


def check_amount_conflict(current_amount: float, related_amounts: List[float], tolerance: float = 0.01) -> Tuple[bool, str]:
    if current_amount is None:
        return False, ""
    for related in related_amounts:
        if related is not None and abs(current_amount - related) > tolerance:
            return True, f"金额{current_amount}与关联金额{related}不一致"
    return False, ""


def check_quantity_conflict(current_qty: int, expected_qty: int) -> Tuple[bool, str]:
    if current_qty is None or expected_qty is None:
        return False, ""
    if current_qty != expected_qty:
        return True, f"数量{current_qty}与预期数量{expected_qty}不一致"
    return False, ""


def check_recharge_record(row: Dict, existing_member_names: Dict[str, List[str]] = None) -> Tuple[bool, str, str, str]:
    is_dirty = False
    dirty_type = None
    dirty_reason = ""
    fix_suggestion = ""

    required_fields = ["member_id", "recharge_amount", "transaction_time"]
    has_missing, missing = check_missing_fields(row, required_fields)
    if has_missing:
        is_dirty = True
        dirty_type = DirtyType.MISSING_FIELD
        dirty_reason = f"缺少必填字段: {', '.join(missing)}"
        fix_suggestion = f"请补充以下字段: {', '.join(missing)}"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    tx_time = parse_datetime(row.get("transaction_time"))
    if tx_time is None:
        is_dirty = True
        dirty_type = DirtyType.INVALID_FORMAT
        dirty_reason = f"交易时间格式无效: {row.get('transaction_time')}"
        fix_suggestion = "请使用 YYYY-MM-DD HH:MM:SS 格式"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    amount = row.get("recharge_amount")
    if not isinstance(amount, (int, float)) or amount < 0:
        is_dirty = True
        dirty_type = DirtyType.INVALID_FORMAT
        dirty_reason = f"充值金额无效: {amount}"
        fix_suggestion = "充值金额必须为非负数字"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    if existing_member_names:
        member_id = str(row.get("member_id", ""))
        if member_id in existing_member_names:
            current_name = str(row.get("member_name", "")).strip()
            has_change, reason = check_name_change(current_name, existing_member_names[member_id])
            if has_change:
                is_dirty = True
                dirty_type = DirtyType.NAME_CHANGE
                dirty_reason = reason
                fix_suggestion = "请核实会员名称是否正确，如确认改名请在备注中说明"

    return is_dirty, dirty_type, dirty_reason, fix_suggestion


def check_refund_record(row: Dict, existing_recharges: Dict[str, float] = None) -> Tuple[bool, str, str, str]:
    is_dirty = False
    dirty_type = None
    dirty_reason = ""
    fix_suggestion = ""

    required_fields = ["member_id", "refund_amount", "transaction_time"]
    has_missing, missing = check_missing_fields(row, required_fields)
    if has_missing:
        is_dirty = True
        dirty_type = DirtyType.MISSING_FIELD
        dirty_reason = f"缺少必填字段: {', '.join(missing)}"
        fix_suggestion = f"请补充以下字段: {', '.join(missing)}"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    refund_amount = row.get("refund_amount")
    if not isinstance(refund_amount, (int, float)) or refund_amount < 0:
        is_dirty = True
        dirty_type = DirtyType.INVALID_FORMAT
        dirty_reason = f"退款金额无效: {refund_amount}"
        fix_suggestion = "退款金额必须为非负数字"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    member_id = str(row.get("member_id", ""))
    if existing_recharges and member_id in existing_recharges:
        total_recharge = existing_recharges[member_id]
        if refund_amount > total_recharge:
            is_dirty = True
            dirty_type = DirtyType.AMOUNT_CONFLICT
            dirty_reason = f"退款金额{refund_amount}超过累计充值{total_recharge}"
            fix_suggestion = "请核实退款金额或补充充值记录"

    return is_dirty, dirty_type, dirty_reason, fix_suggestion


def check_shift_record(row: Dict) -> Tuple[bool, str, str, str]:
    is_dirty = False
    dirty_type = None
    dirty_reason = ""
    fix_suggestion = ""

    required_fields = ["store_id", "shift_date", "shift_no", "cashier"]
    has_missing, missing = check_missing_fields(row, required_fields)
    if has_missing:
        is_dirty = True
        dirty_type = DirtyType.MISSING_FIELD
        dirty_reason = f"缺少必填字段: {', '.join(missing)}"
        fix_suggestion = f"请补充以下字段: {', '.join(missing)}"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    start_balance = row.get("start_balance", 0) or 0
    end_balance = row.get("end_balance", 0) or 0
    cash_sales = row.get("cash_sales", 0) or 0
    member_recharge = row.get("member_recharge", 0) or 0
    member_refund = row.get("member_refund", 0) or 0

    expected_end = start_balance + cash_sales + member_recharge - member_refund
    tolerance = 0.01
    if abs(end_balance - expected_end) > tolerance:
        is_dirty = True
        dirty_type = DirtyType.AMOUNT_CONFLICT
        dirty_reason = f"交班金额不匹配: 期望{expected_end:.2f}，实际{end_balance:.2f}"
        fix_suggestion = "请核对现金、充值、退款金额重新计算"

    return is_dirty, dirty_type, dirty_reason, fix_suggestion


def check_store_handover(row: Dict) -> Tuple[bool, str, str, str]:
    is_dirty = False
    dirty_type = None
    dirty_reason = ""
    fix_suggestion = ""

    required_fields = ["store_id", "handover_date", "outgoing_manager", "incoming_manager"]
    has_missing, missing = check_missing_fields(row, required_fields)
    if has_missing:
        is_dirty = True
        dirty_type = DirtyType.MISSING_FIELD
        dirty_reason = f"缺少必填字段: {', '.join(missing)}"
        fix_suggestion = f"请补充以下字段: {', '.join(missing)}"
        return is_dirty, dirty_type, dirty_reason, fix_suggestion

    return is_dirty, dirty_type, dirty_reason, fix_suggestion
