import math
import re
from typing import Dict, List, Tuple, Any


EMAIL_FIELD_ALIASES: Dict[str, List[str]] = {
    "batch_id": ["批次号", "批次", "batch_id", "batch", "批次编号", "对账批次"],
    "trade_date": ["交易日", "交易日期", "trade_date", "成交日", "交易"],
    "approval_subject": ["主题", "邮件主题", "subject", "审批主题", "标题"],
    "approval_sender": ["发件人", "发送人", "sender", "from", "审批人"],
    "approval_date": ["审批日期", "邮件日期", "发送日期", "date", "发件时间"],
    "tax_amount": ["税费", "税额", "税款", "tax", "tax_amount", "税费金额", "港股通税费"],
    "exchange_rate": ["汇率", "汇价", "exchange_rate", "rate", "港币汇率", "港元汇率"],
    "ccy": ["币种", "货币", "ccy", "currency", "币别"],
    "remarks": ["备注", "remark", "remarks", "说明", "注释"],
}

TAX_FIELD_ALIASES: Dict[str, List[str]] = {
    "batch_id": ["批次号", "批次", "batch_id", "batch", "批次编号", "对账批次"],
    "trade_date": ["交易日", "交易日期", "trade_date", "成交日", "交易"],
    "settlement_date": ["结算日", "结算日期", "settlement_date", "交收日"],
    "tax_type": ["税种", "税费类型", "tax_type", "税项", "税费种类"],
    "tax_amount_hkd": ["港币税费", "港元税费", "hkd税额", "tax_hkd", "tax_amount_hkd", "港币税款"],
    "tax_amount_cny": ["人民币税费", "人民币税额", "cny税额", "tax_cny", "tax_amount_cny", "人民币税款"],
    "exchange_rate": ["汇率", "汇价", "exchange_rate", "rate", "适用汇率"],
    "ccy": ["币种", "货币", "ccy", "currency", "币别"],
    "voucher_no": ["凭证号", "凭证编号", "voucher_no", "voucher", "记账凭证号"],
    "voucher_date": ["凭证日期", "记账日期", "voucher_date", "入账日期"],
    "remarks": ["备注", "remark", "remarks", "说明", "注释"],
}


def _norm_key(k: str) -> str:
    return re.sub(r"\s+", "", str(k)).lower()


def build_field_map(columns: List[str], aliases: Dict[str, List[str]]) -> Dict[str, str]:
    norm_to_orig = {_norm_key(c): c for c in columns}
    mapping: Dict[str, str] = {}
    for std_field, alias_list in aliases.items():
        for alias in alias_list:
            nk = _norm_key(alias)
            if nk in norm_to_orig:
                mapping[std_field] = norm_to_orig[nk]
                break
    return mapping


def _is_nan(v: Any) -> bool:
    if v is None:
        return True
    try:
        return isinstance(v, float) and math.isnan(v)
    except (TypeError, ValueError):
        return False


def safe_float(v: Any) -> float:
    if _is_nan(v):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s or s.lower() == "nan":
        return 0.0
    s = s.replace(",", "").replace("￥", "").replace("¥", "").replace("HKD", "").replace("CNY", "")
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def safe_str(v: Any) -> str:
    if _is_nan(v):
        return ""
    s = str(v).strip()
    if s.lower() in ("nan", "none", "nat"):
        return ""
    return s
