from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

from ..models.recon import (
    ReconBatch,
    ReconItem,
    ProcessStatus,
    ApprovalEmail,
    TaxRecord,
)

RATE_TOLERANCE = 1e-6
AMOUNT_TOLERANCE = 0.02
VOUCHER_GRACE_DAYS = 3


def _trade_date_match(a: str, b: str) -> bool:
    if not a or not b:
        return False
    norm_a = a.replace("/", "-").replace(".", "-")
    norm_b = b.replace("/", "-").replace(".", "-")
    return norm_a == norm_b


def _amount_close(a: float, b: float, tol: float = AMOUNT_TOLERANCE) -> bool:
    if a is None or b is None:
        return False
    return abs(a - b) <= tol


def _build_email_index(emails: List[ApprovalEmail]) -> Dict[str, List[ApprovalEmail]]:
    idx: Dict[str, List[ApprovalEmail]] = {}
    for e in emails:
        k = (e.trade_date or "").strip()
        idx.setdefault(k, []).append(e)
    return idx


def _build_tax_index(records: List[TaxRecord]) -> Dict[str, List[TaxRecord]]:
    idx: Dict[str, List[TaxRecord]] = {}
    for t in records:
        k = (t.trade_date or "").strip()
        idx.setdefault(k, []).append(t)
    return idx


def _check_voucher_late(rec: TaxRecord, run_date: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[str]]:
    if not rec.trade_date:
        return False, None, None
    try:
        t_date = datetime.strptime(rec.trade_date.replace("/", "-"), "%Y-%m-%d")
    except Exception:
        return False, None, None

    expected = t_date + timedelta(days=VOUCHER_GRACE_DAYS + 1)

    if not run_date:
        run_date_dt = datetime.now()
    else:
        try:
            run_date_dt = datetime.strptime(run_date.replace("/", "-"), "%Y-%m-%d")
        except Exception:
            run_date_dt = datetime.now()

    has_voucher = bool(rec.voucher_no and rec.voucher_date)

    if not has_voucher and run_date_dt >= expected:
        reason = f"交易日{rec.trade_date}后{VOUCHER_GRACE_DAYS}天内应到凭证，当前仍无凭证号/凭证日期"
        next_step = "联系托管确认凭证是否在途，或确认凭证号后在系统补录"
        return True, reason, next_step
    return False, None, None


def match_email_to_tax(
    email: ApprovalEmail,
    tax_candidates: List[TaxRecord],
) -> Tuple[Optional[TaxRecord], ProcessStatus, Optional[str], Optional[str]]:
    if not tax_candidates:
        return None, ProcessStatus.NEED_MANUAL, "未找到同交易日税费记录", "请核对邮件对应税费是否已录入"

    best: Optional[TaxRecord] = None
    best_score = -1

    for t in tax_candidates:
        score = 0
        if _trade_date_match(email.trade_date or "", t.trade_date or ""):
            score += 10
        if email.tax_amount and t.tax_amount_hkd and _amount_close(email.tax_amount, t.tax_amount_hkd):
            score += 20
        elif email.tax_amount and t.tax_amount_cny and _amount_close(email.tax_amount, t.tax_amount_cny):
            score += 15
        if email.exchange_rate and t.exchange_rate and abs(email.exchange_rate - t.exchange_rate) <= RATE_TOLERANCE:
            score += 10
        if score > best_score:
            best_score = score
            best = t

    if best is None:
        return None, ProcessStatus.NEED_MANUAL, "未能匹配到合适税费记录", "请检查邮件与税费的交易日/金额是否一致"

    rate_diff = None
    if email.exchange_rate and best.exchange_rate:
        rate_diff = round(email.exchange_rate - best.exchange_rate, 8)

    if rate_diff is not None and abs(rate_diff) > RATE_TOLERANCE:
        reason = f"审批邮件汇率{email.exchange_rate}与税费记录汇率{best.exchange_rate}差异{rate_diff:.8f}，超出容差{RATE_TOLERANCE}"
        next_step = "确认审批邮件或税费记录的汇率来源，以托管对账单为准修正"
        return best, ProcessStatus.MISMATCH, reason, next_step

    if email.tax_amount and best.tax_amount_hkd and not _amount_close(email.tax_amount, best.tax_amount_hkd):
        if not (_amount_close(email.tax_amount, best.tax_amount_cny)):
            reason = f"邮件税费{email.tax_amount}与税费记录HKD {best.tax_amount_hkd}/CNY {best.tax_amount_cny}均不一致"
            next_step = "核对邮件与税费记录的币种及金额，必要时联系托管"
            return best, ProcessStatus.MISMATCH, reason, next_step

    return best, ProcessStatus.MATCHED, None, None


def run_reconciliation(
    batch: ReconBatch,
    run_date: Optional[str] = None,
    extra_remark: Optional[str] = None,
) -> ReconBatch:
    batch.run_count += 1
    batch.last_run_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if extra_remark:
        batch.extra_remarks.append(f"[第{batch.run_count}轮] {extra_remark}")

    email_idx = _build_email_index(batch.emails)
    tax_idx = _build_tax_index(batch.tax_records)

    prev_items: Dict[str, ReconItem] = {it.item_key: it for it in batch.items}
    new_items: List[ReconItem] = []
    used_tax_keys: set = set()

    for email in batch.emails:
        candidates = tax_idx.get((email.trade_date or "").strip(), [])
        candidates = [c for c in candidates if c.row_key() not in used_tax_keys]

        tax, status, reason, next_step = match_email_to_tax(email, candidates)

        rate_diff = None
        if tax and email.exchange_rate and tax.exchange_rate:
            rate_diff = round(email.exchange_rate - tax.exchange_rate, 8)

        voucher_late = False
        if tax:
            voucher_late, v_reason, v_next = _check_voucher_late(tax, run_date)
            if voucher_late:
                status = ProcessStatus.VOUCHER_LATE
                reason = v_reason
                next_step = v_next
            used_tax_keys.add(tax.row_key())

        sources = [email.source_file]
        if tax:
            sources.append(tax.source_file)

        item_key = email.row_key()
        prev = prev_items.get(item_key)

        history_check = None
        if prev and batch.run_count > 1:
            if prev.status == status and prev.exchange_rate_diff == rate_diff:
                history_check = "与上次结果一致"
            else:
                history_check = f"与上次不一致：上次{prev.status.value}，本次{status.value}"
                status = ProcessStatus.HISTORY_MISMATCH
                if not next_step:
                    next_step = "复核本次与上次数据差异，确认是数据修正还是口径变更"

        item = ReconItem(
            item_key=item_key,
            batch_id=batch.batch_id,
            trade_date=email.trade_date,
            status=status,
            reason=reason,
            next_step=next_step,
            email_row_key=email.row_key(),
            tax_row_key=tax.row_key() if tax else None,
            approval_subject=email.approval_subject,
            tax_type=tax.tax_type if tax else None,
            tax_amount_hkd=tax.tax_amount_hkd if tax else None,
            tax_amount_cny=tax.tax_amount_cny if tax else None,
            exchange_rate_from_email=email.exchange_rate,
            exchange_rate_from_tax=tax.exchange_rate if tax else None,
            exchange_rate_diff=rate_diff,
            run_round=batch.run_count,
            remark=extra_remark if extra_remark else None,
            sources=list(set(sources)),
            voucher_no=tax.voucher_no if tax else None,
            voucher_date=tax.voucher_date if tax else None,
            voucher_expected_by=(tax.trade_date + " +3工作日") if tax and tax.trade_date else None,
            history_check=history_check,
        )
        new_items.append(item)

    for tax in batch.tax_records:
        if tax.row_key() in used_tax_keys:
            continue
        voucher_late, v_reason, v_next = _check_voucher_late(tax, run_date)
        status = ProcessStatus.NEED_MANUAL if not voucher_late else ProcessStatus.VOUCHER_LATE
        reason = v_reason if voucher_late else "该税费记录没有匹配到任何审批邮件"
        next_step = v_next if voucher_late else "查找是否漏录审批邮件，或确认该税费是否应在本批次"

        item_key = tax.row_key() + "_taxonly"
        prev = prev_items.get(item_key)
        history_check = None
        if prev and batch.run_count > 1:
            if prev.status == status:
                history_check = "与上次结果一致"
            else:
                history_check = f"与上次不一致：上次{prev.status.value}，本次{status.value}"
                status = ProcessStatus.HISTORY_MISMATCH
                if not next_step:
                    next_step = "复核本次与上次数据差异，确认是数据修正还是口径变更"

        new_items.append(ReconItem(
            item_key=item_key,
            batch_id=batch.batch_id,
            trade_date=tax.trade_date,
            status=status,
            reason=reason,
            next_step=next_step,
            email_row_key=None,
            tax_row_key=tax.row_key(),
            approval_subject=None,
            tax_type=tax.tax_type,
            tax_amount_hkd=tax.tax_amount_hkd,
            tax_amount_cny=tax.tax_amount_cny,
            exchange_rate_from_email=None,
            exchange_rate_from_tax=tax.exchange_rate,
            exchange_rate_diff=None,
            run_round=batch.run_count,
            remark=extra_remark if extra_remark else None,
            sources=[tax.source_file],
            voucher_no=tax.voucher_no,
            voucher_date=tax.voucher_date,
            voucher_expected_by=(tax.trade_date + " +3工作日") if tax.trade_date else None,
            history_check=history_check,
        ))

    batch.items = new_items
    return batch
