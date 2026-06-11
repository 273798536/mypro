import csv
import os
import hashlib
from typing import List, Tuple, Dict
from datetime import datetime
from .models import (
    CustodyReceipt, RiskWarning, BadDataRecord, ConflictRecord,
    WarningStatus, ConfirmReason
)
from . import storage


VALID_CURRENCIES = {"CNY", "USD", "HKD", "EUR", "JPY", "GBP"}
VALID_RISK_LEVELS = {"R1", "R2", "R3", "R4", "R5", "保守型", "稳健型", "平衡型", "进取型", "激进型"}


def _parse_amount(val: str) -> Tuple[float, bool, str]:
    if not val or not val.strip():
        return 0.0, False, "金额为空"
    try:
        cleaned = val.strip().replace(",", "").replace(" ", "")
        return float(cleaned), True, ""
    except ValueError:
        return 0.0, False, f"金额格式错误: {val}"


def _validate_currency(val: str) -> Tuple[bool, str]:
    if not val:
        return False, "币种为空"
    v = val.strip().upper()
    if v not in VALID_CURRENCIES:
        return False, f"币种不在合法集合中: {val} (合法值: {sorted(VALID_CURRENCIES)})"
    return True, ""


def _check_risk_mismatch(product_risk: str, investor_risk: str) -> bool:
    p = product_risk.strip()
    i = investor_risk.strip()
    order_map = {
        "R1": 1, "保守型": 1,
        "R2": 2, "稳健型": 2,
        "R3": 3, "平衡型": 3,
        "R4": 4, "进取型": 4,
        "R5": 5, "激进型": 5,
    }
    po = order_map.get(p, 0)
    io = order_map.get(i, 0)
    if po == 0 or io == 0:
        return False
    return po > io


def _sha1_row(batch_id: str, source_file: str, row_num: int, raw_row: dict) -> str:
    payload = "|".join([
        batch_id, os.path.basename(source_file), str(row_num),
        ",".join(f"{k}={v}" for k, v in sorted(raw_row.items()))
    ])
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def import_custody_csv(file_path: str, batch_id: str) -> Dict:
    storage.init_db()
    if not os.path.exists(file_path):
        return {"ok": False, "error": f"文件不存在: {file_path}"}
    if not batch_id or not batch_id.strip():
        return {"ok": False, "error": "批次号(--batch-id)不能为空"}

    source_name = os.path.basename(file_path)
    import_round = storage.get_next_import_round(batch_id, file_path)

    receipts: List[CustodyReceipt] = []
    bad_records: List[BadDataRecord] = []
    warnings: List[RiskWarning] = []
    skipped_duplicates = 0
    row_num = 0

    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return {"ok": False, "error": "CSV文件为空或缺少表头"}

            for raw_row in reader:
                row_num += 1
                row = {k: (v or "").strip() for k, v in raw_row.items()}
                raw_content = ",".join(f"{k}={v}" for k, v in raw_row.items())
                sha1 = _sha1_row(batch_id, source_name, row_num, raw_row)

                existing_id = storage.find_receipt_by_sha1(batch_id, sha1)
                if existing_id:
                    skipped_duplicates += 1
                    continue

                receipt = CustodyReceipt(
                    batch_id=batch_id,
                    source_file=source_name,
                    row_number=row_num,
                    trade_date=row.get("交易日期", row.get("trade_date", "")),
                    fund_code=row.get("基金代码", row.get("fund_code", "")),
                    fund_name=row.get("基金名称", row.get("fund_name", "")),
                    investor_id=row.get("投资者编号", row.get("investor_id", "")),
                    investor_name=row.get("投资者名称", row.get("investor_name", "")),
                    business_type=row.get("业务类型", row.get("business_type", "")),
                    risk_level=row.get("产品风险等级", row.get("risk_level", "")),
                    investor_risk_level=row.get("投资者风险等级", row.get("investor_risk_level", "")),
                    calibre=row.get("统计口径", row.get("calibre", "")),
                    raw_content=raw_content,
                    import_round=import_round,
                    source_sha1=sha1,
                )

                amount_raw = row.get("金额", row.get("amount", ""))
                currency_raw = row.get("币种", row.get("currency", ""))

                amount_ok, amount_msg = True, ""
                receipt.amount, amount_ok, amount_msg = _parse_amount(amount_raw)
                if not amount_ok:
                    bd = BadDataRecord(
                        source_file=source_name,
                        row_number=row_num,
                        field_name="amount",
                        raw_value=amount_raw,
                        error_message=amount_msg,
                        raw_content=raw_content,
                        import_round=import_round,
                    )
                    bad_records.append(bd)

                cur_ok, cur_msg = _validate_currency(currency_raw)
                receipt.currency = currency_raw.strip().upper() if cur_ok else currency_raw.strip()
                if not cur_ok:
                    bd = BadDataRecord(
                        source_file=source_name,
                        row_number=row_num,
                        field_name="currency",
                        raw_value=currency_raw,
                        error_message=cur_msg,
                        raw_content=raw_content,
                        import_round=import_round,
                    )
                    bad_records.append(bd)

                receipt_id = storage.insert_receipt(receipt)
                receipt.id = receipt_id
                receipts.append(receipt)

                if amount_ok and cur_ok:
                    if _check_risk_mismatch(receipt.risk_level, receipt.investor_risk_level):
                        w = RiskWarning(
                            receipt_id=receipt_id,
                            batch_id=batch_id,
                            warning_code="",  # 插入后用自增 ID 更新，保证全局唯一
                            warning_type="风险等级不匹配",
                            description=(
                                f"投资者[{receipt.investor_name}({receipt.investor_id})] "
                                f"风险等级[{receipt.investor_risk_level}]低于"
                                f"产品[{receipt.fund_name}({receipt.fund_code})] "
                                f"风险等级[{receipt.risk_level}]"
                            ),
                            status=WarningStatus.PENDING_CONFIRM,
                            import_round=import_round,
                        )
                        wid = storage.insert_warning(w)
                        w.id = wid
                        w.warning_code = f"RW-{batch_id}-{wid:03d}"
                        storage.update_warning_code(wid, w.warning_code)
                        warnings.append(w)
                        storage.insert_history(__import_history(
                            wid, "create", "", WarningStatus.PENDING_CONFIRM.value,
                            f"导入托管回执生成预警(第{import_round}轮)，来源文件:{source_name} 行号:{row_num}"
                        ))
                elif not cur_ok:
                    w = RiskWarning(
                        receipt_id=receipt_id,
                        batch_id=batch_id,
                        warning_code="",  # 插入后用自增 ID 更新，保证全局唯一
                        warning_type="币种异常待确认",
                        description=(
                            f"投资者[{receipt.investor_name}] 金额 [{amount_raw}] "
                            f"币种 [{currency_raw}] 不符合规范，需人工确认"
                        ),
                        status=WarningStatus.PENDING_CONFIRM,
                        confirm_reason=ConfirmReason.CURRENCY_MISMATCH,
                        confirm_note=cur_msg,
                        import_round=import_round,
                    )
                    wid = storage.insert_warning(w)
                    w.id = wid
                    w.warning_code = f"RW-{batch_id}-{wid:03d}"
                    storage.update_warning_code(wid, w.warning_code)
                    warnings.append(w)
                    storage.insert_history(__import_history(
                        wid, "create", "", WarningStatus.PENDING_CONFIRM.value,
                        f"币种异常需人工确认: {cur_msg}，来源行号:{row_num} (第{import_round}轮)"
                    ))

    except UnicodeDecodeError as e:
        return {"ok": False, "error": f"文件编码错误，请使用UTF-8: {e}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"导入失败: {str(e)}\n{traceback.format_exc()}"}

    for bd in bad_records:
        storage.insert_bad_data(bd)

    conflicts = _detect_conflicts(batch_id, warnings, import_round)
    for c in conflicts:
        storage.insert_conflict(c)

    storage.record_import_meta(
        batch_id, source_name, import_round,
        receipts=len(receipts), warnings=len(warnings),
        bad=len(bad_records), conflicts=len(conflicts)
    )

    return {
        "ok": True,
        "batch_id": batch_id,
        "import_round": import_round,
        "source_file": source_name,
        "receipts_count": len(receipts),
        "warnings_count": len(warnings),
        "bad_data_count": len(bad_records),
        "conflict_count": len(conflicts),
        "skipped_duplicates": skipped_duplicates,
        "bad_data_preview": [
            {"row": b.row_number, "field": b.field_name, "error": b.error_message}
            for b in bad_records[:10]
        ],
        "conflict_preview": [
            {"id": c.id, "investor": c.investor_name, "amount": c.amount,
             "calibres": c.calibres, "warning_ids": c.warning_ids}
            for c in conflicts[:10]
        ],
    }


def _detect_conflicts(batch_id: str, warnings: List[RiskWarning], import_round: int) -> List[ConflictRecord]:
    from collections import defaultdict
    groups = defaultdict(list)
    for w in warnings:
        r = storage.get_receipt_by_id(w.receipt_id)
        if not r or not r.calibre:
            continue
        key = (r.investor_id, round(r.amount, 2))
        groups[key].append((w, r))

    conflicts = []
    for (inv_id, amount), items in groups.items():
        calibres = list({r.calibre for _, r in items})
        if len(calibres) >= 2:
            inv_name = items[0][1].investor_name
            conflict = ConflictRecord(
                batch_id=batch_id,
                amount=amount,
                investor_id=inv_id,
                investor_name=inv_name,
                warning_ids=[w.id for w, _ in items],
                calibres=calibres,
                resolved=False,
                resolution="",
                import_round=import_round,
            )
            conflicts.append(conflict)
            for w, _ in items:
                storage.update_warning_status(
                    w.id, WarningStatus.CONFLICT,
                    confirm_reason=ConfirmReason.DOUBLE_COUNTING.value,
                    confirm_note=f"同一笔金额{amount}被口径{calibres}重复识别"
                )
                storage.insert_history(__import_history(
                    w.id, "detect_conflict", w.status.value, WarningStatus.CONFLICT.value,
                    f"检测到双口径冲突(第{import_round}轮): {calibres}, 金额={amount}"
                ))
    return conflicts


def __import_history(warning_id: int, action: str, old: str, new: str, detail: str):
    from .models import WarningHistory
    return WarningHistory(
        warning_id=warning_id,
        action=action,
        action_by="system",
        old_status=old,
        new_status=new,
        detail=detail,
    )
