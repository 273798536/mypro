import os
import re
from typing import List, Tuple, Dict, Any
import pandas as pd

from ..models.recon import ApprovalEmail, TaxRecord
from .field_mapping import (
    EMAIL_FIELD_ALIASES,
    TAX_FIELD_ALIASES,
    build_field_map,
    safe_float,
    safe_str,
)


def _read_table(path: str) -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(path, dtype=object)
    elif ext == ".csv":
        return pd.read_csv(path, dtype=object)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def load_emails(path: str, batch_id: str = "") -> Tuple[List[ApprovalEmail], Dict[str, str]]:
    df = _read_table(path)
    cols = list(df.columns)
    field_map = build_field_map(cols, EMAIL_FIELD_ALIASES)
    emails: List[ApprovalEmail] = []

    for _, row in df.iterrows():
        raw = {c: row[c] for c in cols if pd.notna(row[c])}
        email = ApprovalEmail(
            source_file=os.path.basename(path),
            raw_fields=raw,
            batch_id=safe_str(row.get(field_map.get("batch_id", ""), "")) or batch_id,
            trade_date=safe_str(row.get(field_map.get("trade_date", ""), "")),
            approval_subject=safe_str(row.get(field_map.get("approval_subject", ""), "")),
            approval_sender=safe_str(row.get(field_map.get("approval_sender", ""), "")),
            approval_date=safe_str(row.get(field_map.get("approval_date", ""), "")),
            tax_amount=safe_float(row.get(field_map.get("tax_amount", ""), None)),
            exchange_rate=safe_float(row.get(field_map.get("exchange_rate", ""), None)),
            ccy=safe_str(row.get(field_map.get("ccy", ""), "")),
            remarks=safe_str(row.get(field_map.get("remarks", ""), "")),
            normalized=bool(field_map),
            normalized_field_map=field_map,
        )
        emails.append(email)
    return emails, field_map


def load_tax_records(path: str, batch_id: str = "") -> Tuple[List[TaxRecord], Dict[str, str]]:
    df = _read_table(path)
    cols = list(df.columns)
    field_map = build_field_map(cols, TAX_FIELD_ALIASES)
    records: List[TaxRecord] = []

    for _, row in df.iterrows():
        raw = {c: row[c] for c in cols if pd.notna(row[c])}
        rec = TaxRecord(
            source_file=os.path.basename(path),
            raw_fields=raw,
            batch_id=safe_str(row.get(field_map.get("batch_id", ""), "")) or batch_id,
            trade_date=safe_str(row.get(field_map.get("trade_date", ""), "")),
            settlement_date=safe_str(row.get(field_map.get("settlement_date", ""), "")),
            tax_type=safe_str(row.get(field_map.get("tax_type", ""), "")),
            tax_amount_hkd=safe_float(row.get(field_map.get("tax_amount_hkd", ""), None)),
            tax_amount_cny=safe_float(row.get(field_map.get("tax_amount_cny", ""), None)),
            exchange_rate=safe_float(row.get(field_map.get("exchange_rate", ""), None)),
            ccy=safe_str(row.get(field_map.get("ccy", ""), "")),
            voucher_no=safe_str(row.get(field_map.get("voucher_no", ""), "")),
            voucher_date=safe_str(row.get(field_map.get("voucher_date", ""), "")),
            remarks=safe_str(row.get(field_map.get("remarks", ""), "")),
            normalized=bool(field_map),
            normalized_field_map=field_map,
        )
        records.append(rec)
    return records, field_map


def load_eml_file(path: str, batch_id: str = "") -> Tuple[List[ApprovalEmail], Dict[str, str]]:
    try:
        import email
        from email import policy
    except ImportError:
        return [], {}

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        msg = email.message_from_file(f, policy=policy.default)

    subject = safe_str(msg.get("Subject", ""))
    sender = safe_str(msg.get("From", ""))
    date_str = safe_str(msg.get("Date", ""))

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype in ("text/plain", "text/html"):
                try:
                    payload = part.get_payload(decode=True)
                    body = payload.decode("utf-8", errors="ignore")
                    break
                except Exception:
                    continue
    else:
        try:
            payload = msg.get_payload(decode=True)
            body = payload.decode("utf-8", errors="ignore") if payload else ""
        except Exception:
            body = safe_str(msg.get_payload())

    tax_match = re.search(r"(?:税费|税款|税额|tax)[^\d]{0,6}([\d,]+\.?\d*)", body, re.IGNORECASE)
    rate_match = re.search(r"(?:汇率|汇价|rate)[^\d]{0,6}([\d,]+\.?\d*)", body, re.IGNORECASE)
    date_match = re.search(r"(?:交易日|交易日期|成交日)[^\d]{0,6}(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)", body)

    tax_amt = safe_float(tax_match.group(1)) if tax_match else 0.0
    exc_rate = safe_float(rate_match.group(1)) if rate_match else 0.0
    trade_dt = safe_str(date_match.group(1)).replace("年", "-").replace("月", "-").replace("日", "") if date_match else ""

    raw_fields = {
        "subject": subject,
        "from": sender,
        "date": date_str,
        "body_preview": body[:500],
    }
    email_obj = ApprovalEmail(
        source_file=os.path.basename(path),
        raw_fields=raw_fields,
        batch_id=batch_id,
        trade_date=trade_dt,
        approval_subject=subject,
        approval_sender=sender,
        approval_date=date_str,
        tax_amount=tax_amt,
        exchange_rate=exc_rate,
        ccy="HKD",
        remarks="从eml邮件正文提取",
        normalized=True,
        normalized_field_map={"eml_parse": "auto"},
    )
    return [email_obj], {"eml_parse": "auto"}
