import re
from typing import Optional, Tuple
from datetime import datetime


def parse_mixed_tax_rate(mixed_value: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    if not mixed_value or not isinstance(mixed_value, str):
        return None, None, "税费/汇率列为空"

    mixed_value = mixed_value.strip()

    if "/" not in mixed_value:
        return None, None, f"税费/汇率列格式错误：缺少分隔符'/'，原始值='{mixed_value}'"

    parts = mixed_value.split("/", 1)
    tax_str = parts[0].strip().replace(",", "")
    rate_str = parts[1].strip().replace(",", "")

    tax_amount = None
    exchange_rate = None
    error = None

    try:
        if tax_str and tax_str not in ("待确认", "未知", ""):
            tax_amount = float(tax_str)
    except ValueError:
        error = f"税费解析失败：'{tax_str}' 不是有效数字，原始值='{mixed_value}'"

    try:
        if rate_str and rate_str not in ("待确认", "未知", ""):
            exchange_rate = float(rate_str)
    except ValueError:
        if error:
            error += f"；汇率解析失败：'{rate_str}' 不是有效数字"
        else:
            error = f"汇率解析失败：'{rate_str}' 不是有效数字，原始值='{mixed_value}'"

    return tax_amount, exchange_rate, error


def parse_amount(amount_str) -> Tuple[Optional[float], Optional[str]]:
    if amount_str is None:
        return None, "金额为空"
    if isinstance(amount_str, (int, float)):
        return float(amount_str), None

    cleaned = str(amount_str).strip().replace(",", "").replace("¥", "").replace("￥", "")

    try:
        return float(cleaned), None
    except ValueError:
        return None, f"金额解析失败：'{amount_str}' 不是有效数字"


def is_valid_counterparty(name: str) -> bool:
    if not name or not isinstance(name, str):
        return False
    stripped = name.strip()
    if not stripped:
        return False
    invalid_patterns = ["？", "?", "XXX", "---", "___", "无"]
    for p in invalid_patterns:
        if p in stripped:
            return False
    return len(stripped) >= 2


def generate_unique_key(voucher_number: str, transaction_date=None, amount=None) -> str:
    if voucher_number and voucher_number.strip():
        return voucher_number.strip()
    parts = []
    if transaction_date:
        if isinstance(transaction_date, datetime):
            parts.append(transaction_date.strftime("%Y%m%d"))
        else:
            parts.append(str(transaction_date))
    if amount is not None:
        parts.append(str(amount))
    return "-".join(parts) if parts else f"TEMP-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
