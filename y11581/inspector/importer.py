import pandas as pd
import json
import hashlib
from typing import Dict, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from .database import (
    ImportBatch, RawRecord, RechargeRecord, RefundRecord,
    ShiftRecord, StoreHandover
)
from .dirty_checker import (
    check_recharge_record, check_refund_record,
    check_shift_record, check_store_handover, parse_datetime
)


def calculate_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def read_data_file(filepath: str) -> pd.DataFrame:
    if filepath.endswith('.xlsx') or filepath.endswith('.xls'):
        return pd.read_excel(filepath)
    elif filepath.endswith('.csv'):
        return pd.read_csv(filepath)
    elif filepath.endswith('.json'):
        return pd.read_json(filepath)
    else:
        raise ValueError(f"不支持的文件格式: {filepath}")


def import_recharge_data(
    db: Session,
    filepath: str,
    imported_by: str,
    source_type: str = "recharge"
) -> Tuple[ImportBatch, int, int]:
    df = read_data_file(filepath)
    file_hash = calculate_file_hash(filepath)

    existing = (
        db.query(ImportBatch)
        .filter(
            ImportBatch.source_type == source_type,
            ImportBatch.file_hash == file_hash,
        )
        .first()
    )

    if existing:
        return existing, existing.valid_rows, existing.dirty_rows

    batch = ImportBatch(
        source_type=source_type,
        file_name=filepath.split('/')[-1],
        file_hash=file_hash,
        imported_by=imported_by,
        total_rows=len(df),
        status="imported",
    )
    db.add(batch)
    db.flush()

    existing_member_names = {}
    prev_names = (
        db.query(RechargeRecord.member_id, RechargeRecord.member_name)
        .filter(RechargeRecord.member_name.isnot(None))
        .distinct()
        .all()
    )
    for mid, name in prev_names:
        if mid not in existing_member_names:
            existing_member_names[mid] = []
        if name and name not in existing_member_names[mid]:
            existing_member_names[mid].append(name)

    current_batch_names = {}

    valid_count = 0
    dirty_count = 0

    for idx, row in df.iterrows():
        original_row = idx + 2
        row_dict = row.to_dict()

        combined_names = existing_member_names.copy()
        for mid, names in current_batch_names.items():
            if mid not in combined_names:
                combined_names[mid] = []
            for name in names:
                if name not in combined_names[mid]:
                    combined_names[mid].append(name)

        is_dirty, dirty_type, dirty_reason, fix_suggestion = check_recharge_record(
            row_dict, combined_names
        )

        raw = RawRecord(
            batch_id=batch.id,
            source_type=source_type,
            original_row=original_row,
            raw_data=json.dumps(row_dict, ensure_ascii=False, default=str),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason,
            fix_suggestion=fix_suggestion,
        )
        db.add(raw)

        if not is_dirty:
            valid_count += 1
            record = RechargeRecord(
                batch_id=batch.id,
                member_id=str(row_dict.get("member_id", "")),
                member_name=str(row_dict.get("member_name", "")),
                store_id=str(row_dict.get("store_id", "")),
                store_name=str(row_dict.get("store_name", "")),
                recharge_amount=float(row_dict.get("recharge_amount", 0) or 0),
                bonus_amount=float(row_dict.get("bonus_amount", 0) or 0),
                payment_method=str(row_dict.get("payment_method", "")),
                transaction_time=parse_datetime(row_dict.get("transaction_time")),
                operator=str(row_dict.get("operator", "")),
                original_row=original_row,
                is_dirty=False,
                is_cross_store=bool(row_dict.get("is_cross_store", False)),
                is_revoked=bool(row_dict.get("is_revoked", False)),
            )
            db.add(record)
        else:
            dirty_count += 1
            record = RechargeRecord(
                batch_id=batch.id,
                member_id=str(row_dict.get("member_id", "")),
                member_name=str(row_dict.get("member_name", "")),
                store_id=str(row_dict.get("store_id", "")),
                store_name=str(row_dict.get("store_name", "")),
                recharge_amount=float(row_dict.get("recharge_amount", 0) if row_dict.get("recharge_amount") else 0),
                bonus_amount=float(row_dict.get("bonus_amount", 0) if row_dict.get("bonus_amount") else 0),
                payment_method=str(row_dict.get("payment_method", "")),
                transaction_time=parse_datetime(row_dict.get("transaction_time")),
                operator=str(row_dict.get("operator", "")),
                original_row=original_row,
                is_dirty=True,
                dirty_type=dirty_type,
                is_cross_store=bool(row_dict.get("is_cross_store", False)),
                is_revoked=bool(row_dict.get("is_revoked", False)),
            )
            db.add(record)

        member_id = str(row_dict.get("member_id", ""))
        member_name = str(row_dict.get("member_name", "")).strip()
        if member_id and member_name and member_name != "nan":
            if member_id not in current_batch_names:
                current_batch_names[member_id] = []
            if member_name not in current_batch_names[member_id]:
                current_batch_names[member_id].append(member_name)

    batch.valid_rows = valid_count
    batch.dirty_rows = dirty_count
    db.commit()

    return batch, valid_count, dirty_count


def import_refund_data(
    db: Session,
    filepath: str,
    imported_by: str,
    source_type: str = "refund"
) -> Tuple[ImportBatch, int, int]:
    df = read_data_file(filepath)
    file_hash = calculate_file_hash(filepath)

    existing = (
        db.query(ImportBatch)
        .filter(
            ImportBatch.source_type == source_type,
            ImportBatch.file_hash == file_hash,
        )
        .first()
    )

    if existing:
        return existing, existing.valid_rows, existing.dirty_rows

    batch = ImportBatch(
        source_type=source_type,
        file_name=filepath.split('/')[-1],
        file_hash=file_hash,
        imported_by=imported_by,
        total_rows=len(df),
        status="imported",
    )
    db.add(batch)
    db.flush()

    existing_recharges = {}
    recharges = (
        db.query(RechargeRecord.member_id, RechargeRecord.recharge_amount)
        .filter(RechargeRecord.is_dirty == False)
        .all()
    )
    for mid, amount in recharges:
        if mid not in existing_recharges:
            existing_recharges[mid] = 0
        existing_recharges[mid] += amount or 0

    valid_count = 0
    dirty_count = 0

    for idx, row in df.iterrows():
        original_row = idx + 2
        row_dict = row.to_dict()

        is_dirty, dirty_type, dirty_reason, fix_suggestion = check_refund_record(
            row_dict, existing_recharges
        )

        raw = RawRecord(
            batch_id=batch.id,
            source_type=source_type,
            original_row=original_row,
            raw_data=json.dumps(row_dict, ensure_ascii=False, default=str),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason,
            fix_suggestion=fix_suggestion,
        )
        db.add(raw)

        if not is_dirty:
            valid_count += 1
            record = RefundRecord(
                batch_id=batch.id,
                member_id=str(row_dict.get("member_id", "")),
                member_name=str(row_dict.get("member_name", "")),
                store_id=str(row_dict.get("store_id", "")),
                store_name=str(row_dict.get("store_name", "")),
                refund_amount=float(row_dict.get("refund_amount", 0) or 0),
                refund_reason=str(row_dict.get("refund_reason", "")),
                transaction_time=parse_datetime(row_dict.get("transaction_time")),
                operator=str(row_dict.get("operator", "")),
                reviewer=str(row_dict.get("reviewer", "")),
                original_row=original_row,
                is_dirty=False,
                is_cross_store=bool(row_dict.get("is_cross_store", False)),
                is_revoked=bool(row_dict.get("is_revoked", False)),
            )
            db.add(record)
        else:
            dirty_count += 1
            record = RefundRecord(
                batch_id=batch.id,
                member_id=str(row_dict.get("member_id", "")),
                member_name=str(row_dict.get("member_name", "")),
                store_id=str(row_dict.get("store_id", "")),
                store_name=str(row_dict.get("store_name", "")),
                refund_amount=float(row_dict.get("refund_amount", 0) if row_dict.get("refund_amount") else 0),
                refund_reason=str(row_dict.get("refund_reason", "")),
                transaction_time=parse_datetime(row_dict.get("transaction_time")),
                operator=str(row_dict.get("operator", "")),
                reviewer=str(row_dict.get("reviewer", "")),
                original_row=original_row,
                is_dirty=True,
                dirty_type=dirty_type,
                is_cross_store=bool(row_dict.get("is_cross_store", False)),
                is_revoked=bool(row_dict.get("is_revoked", False)),
            )
            db.add(record)

    batch.valid_rows = valid_count
    batch.dirty_rows = dirty_count
    db.commit()

    return batch, valid_count, dirty_count


def import_shift_data(
    db: Session,
    filepath: str,
    imported_by: str,
    source_type: str = "shift"
) -> Tuple[ImportBatch, int, int]:
    df = read_data_file(filepath)
    file_hash = calculate_file_hash(filepath)

    existing = (
        db.query(ImportBatch)
        .filter(
            ImportBatch.source_type == source_type,
            ImportBatch.file_hash == file_hash,
        )
        .first()
    )

    if existing:
        return existing, existing.valid_rows, existing.dirty_rows

    batch = ImportBatch(
        source_type=source_type,
        file_name=filepath.split('/')[-1],
        file_hash=file_hash,
        imported_by=imported_by,
        total_rows=len(df),
        status="imported",
    )
    db.add(batch)
    db.flush()

    valid_count = 0
    dirty_count = 0

    for idx, row in df.iterrows():
        original_row = idx + 2
        row_dict = row.to_dict()

        is_dirty, dirty_type, dirty_reason, fix_suggestion = check_shift_record(row_dict)

        raw = RawRecord(
            batch_id=batch.id,
            source_type=source_type,
            original_row=original_row,
            raw_data=json.dumps(row_dict, ensure_ascii=False, default=str),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason,
            fix_suggestion=fix_suggestion,
        )
        db.add(raw)

        if not is_dirty:
            valid_count += 1
        else:
            dirty_count += 1

        record = ShiftRecord(
            batch_id=batch.id,
            store_id=str(row_dict.get("store_id", "")),
            shift_date=parse_datetime(row_dict.get("shift_date")),
            shift_no=str(row_dict.get("shift_no", "")),
            cashier=str(row_dict.get("cashier", "")),
            start_balance=float(row_dict.get("start_balance", 0) if row_dict.get("start_balance") else 0),
            end_balance=float(row_dict.get("end_balance", 0) if row_dict.get("end_balance") else 0),
            cash_sales=float(row_dict.get("cash_sales", 0) if row_dict.get("cash_sales") else 0),
            card_sales=float(row_dict.get("card_sales", 0) if row_dict.get("card_sales") else 0),
            member_recharge=float(row_dict.get("member_recharge", 0) if row_dict.get("member_recharge") else 0),
            member_refund=float(row_dict.get("member_refund", 0) if row_dict.get("member_refund") else 0),
            original_row=original_row,
            is_dirty=is_dirty,
            dirty_type=dirty_type,
        )
        db.add(record)

    batch.valid_rows = valid_count
    batch.dirty_rows = dirty_count
    db.commit()

    return batch, valid_count, dirty_count


def import_handover_data(
    db: Session,
    filepath: str,
    imported_by: str,
    source_type: str = "handover"
) -> Tuple[ImportBatch, int, int]:
    df = read_data_file(filepath)
    file_hash = calculate_file_hash(filepath)

    existing = (
        db.query(ImportBatch)
        .filter(
            ImportBatch.source_type == source_type,
            ImportBatch.file_hash == file_hash,
        )
        .first()
    )

    if existing:
        return existing, existing.valid_rows, existing.dirty_rows

    batch = ImportBatch(
        source_type=source_type,
        file_name=filepath.split('/')[-1],
        file_hash=file_hash,
        imported_by=imported_by,
        total_rows=len(df),
        status="imported",
    )
    db.add(batch)
    db.flush()

    valid_count = 0
    dirty_count = 0

    for idx, row in df.iterrows():
        original_row = idx + 2
        row_dict = row.to_dict()

        is_dirty, dirty_type, dirty_reason, fix_suggestion = check_store_handover(row_dict)

        raw = RawRecord(
            batch_id=batch.id,
            source_type=source_type,
            original_row=original_row,
            raw_data=json.dumps(row_dict, ensure_ascii=False, default=str),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason,
            fix_suggestion=fix_suggestion,
        )
        db.add(raw)

        if not is_dirty:
            valid_count += 1
        else:
            dirty_count += 1

        record = StoreHandover(
            batch_id=batch.id,
            store_id=str(row_dict.get("store_id", "")),
            store_name=str(row_dict.get("store_name", "")),
            handover_date=parse_datetime(row_dict.get("handover_date")),
            outgoing_manager=str(row_dict.get("outgoing_manager", "")),
            incoming_manager=str(row_dict.get("incoming_manager", "")),
            member_count=int(row_dict.get("member_count", 0) if row_dict.get("member_count") else 0),
            total_balance=float(row_dict.get("total_balance", 0) if row_dict.get("total_balance") else 0),
            cash_on_hand=float(row_dict.get("cash_on_hand", 0) if row_dict.get("cash_on_hand") else 0),
            original_row=original_row,
            is_dirty=is_dirty,
            dirty_type=dirty_type,
        )
        db.add(record)

    batch.valid_rows = valid_count
    batch.dirty_rows = dirty_count
    db.commit()

    return batch, valid_count, dirty_count
