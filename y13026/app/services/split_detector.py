from typing import Optional, Tuple
from app.models import PlaybackDetail, PlaybackStatus, SourceType

SPLIT_KEYWORDS = [
    "分笔", "拆单", "分批", "多笔", "合计", "汇总",
    "split", "multiple", "batch",
]

AMOUNT_PATTERNS = [
    "金额", "回款", "到账", "付款", "amount", "payment",
]


def detect_split_repayment(
    raw_email_content: str,
    voucher_content: Optional[str] = None,
    transaction_amount: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    检测是否存在回款拆行情况，返回(是否拆行, 可操作提示)
    提示要写成人能照着处理的下一步
    """
    combined = (raw_email_content or "") + "\n" + (voucher_content or "")
    combined_lower = combined.lower()

    has_split_keyword = any(kw.lower() in combined_lower for kw in SPLIT_KEYWORDS)
    has_amount_pattern = any(p.lower() in combined_lower for p in AMOUNT_PATTERNS)

    line_count = len([l for l in combined.splitlines() if l.strip()])
    likely_multiline = line_count >= 5

    if has_split_keyword or (has_amount_pattern and likely_multiline):
        hint = _build_actionable_hint(transaction_amount)
        return True, hint

    return False, None


def _build_actionable_hint(transaction_amount: Optional[str]) -> str:
    parts = []
    parts.append("检测到回款可能拆分为多行记录，可能影响异常回放结论一致性。")
    parts.append("请按以下步骤处理：")
    parts.append("1. 逐行核对审批邮件中的回款明细，列出每一笔回款的金额、日期、付款方。")
    parts.append("2. 将后补凭证中的回款记录与审批邮件逐笔对应，标记缺失或不一致的凭证。")
    if transaction_amount:
        parts.append(f"3. 核对拆分后的多笔回款合计是否等于交易金额【{transaction_amount}】。")
    else:
        parts.append("3. 核对拆分后的多笔回款合计是否等于该笔业务的交易总金额。")
    parts.append("4. 如有缺失凭证，请在【后补凭证】中补充对应材料后重新运行回放。")
    parts.append("5. 如确认拆分不影响适当性结论，请通过【人工改判】接口明确记录改判原因。")
    return "\n".join(parts)


def determine_detail_status(detail: PlaybackDetail) -> PlaybackStatus:
    """
    根据明细当前数据判断状态：
    - 有结论历史且最后一条来自人工改判 → 人工改判
    - 有审批邮件+后补凭证 → 已处理（不再要求 current_conclusion 非空，凭证到齐即可判定）
    - 否则 → 待补材料
    """
    history = sorted(detail.conclusion_history, key=lambda h: h.sequence)
    if history and history[-1].changed_by and "人工" in (history[-1].changed_by or ""):
        return PlaybackStatus.MANUAL_OVERRIDDEN

    source_types = set()
    for s in detail.sources:
        val = s.source_type
        if isinstance(val, str):
            source_types.add(val)
        else:
            source_types.add(val.value)

    has_email = SourceType.APPROVAL_EMAIL.value in source_types
    has_voucher = SourceType.SUPPLEMENT_VOUCHER.value in source_types

    if has_email and has_voucher:
        return PlaybackStatus.PROCESSED

    return PlaybackStatus.PENDING_MATERIAL
