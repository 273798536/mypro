import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    ImportRecord,
    DataSourceType,
    CompensationQueue
)
from app.schemas.schemas import (
    ImportRecordCreate,
    CompensationQueueCreate
)
from app.services.compensation_service import (
    create_compensation,
    record_operation_log,
    OperationType
)


def generate_batch_no() -> str:
    return f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"


def parse_check_in_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "check_in_no": str(raw_data.get("check_in_no", "")),
        "room_no": str(raw_data.get("room_no", "")),
        "guest_name": str(raw_data.get("guest_name", "")),
        "check_in_date": raw_data.get("check_in_date"),
        "check_out_date": raw_data.get("check_out_date"),
        "amount": float(raw_data.get("amount", 0)),
        "deposit_amount": float(raw_data.get("deposit_amount", 0)),
        "invoice_amount": float(raw_data.get("invoice_amount", 0)),
        "payment_method": raw_data.get("payment_method"),
        "operator": raw_data.get("operator")
    }


def parse_deposit_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "check_in_no": str(raw_data.get("check_in_no", "")),
        "room_no": str(raw_data.get("room_no", "")),
        "guest_name": str(raw_data.get("guest_name", "")),
        "deposit_amount": float(raw_data.get("deposit_amount", 0)),
        "deposit_type": raw_data.get("deposit_type"),
        "payment_method": raw_data.get("payment_method"),
        "transaction_time": raw_data.get("transaction_time"),
        "operator": raw_data.get("operator")
    }


def parse_room_change_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "check_in_no": str(raw_data.get("check_in_no", "")),
        "old_room_no": str(raw_data.get("old_room_no", "")),
        "new_room_no": str(raw_data.get("new_room_no", "")),
        "guest_name": str(raw_data.get("guest_name", "")),
        "room_price_diff": float(raw_data.get("room_price_diff", 0)),
        "change_time": raw_data.get("change_time"),
        "operator": raw_data.get("operator"),
        "change_reason": raw_data.get("change_reason")
    }


def parse_inventory_diff_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "check_in_no": str(raw_data.get("check_in_no", "")),
        "room_no": str(raw_data.get("room_no", "")),
        "guest_name": str(raw_data.get("guest_name", "")),
        "diff_amount": float(raw_data.get("diff_amount", 0)),
        "diff_type": raw_data.get("diff_type"),
        "diff_reason": raw_data.get("diff_reason"),
        "audit_time": raw_data.get("audit_time"),
        "operator": raw_data.get("operator")
    }


def parse_refund_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "check_in_no": str(raw_data.get("check_in_no", "")),
        "room_no": str(raw_data.get("room_no", "")),
        "guest_name": str(raw_data.get("guest_name", "")),
        "refund_amount": float(raw_data.get("refund_amount", 0)),
        "refund_type": raw_data.get("refund_type"),
        "refund_reason": raw_data.get("refund_reason"),
        "refund_time": raw_data.get("refund_time"),
        "operator": raw_data.get("operator")
    }


PARSE_FUNCTIONS = {
    DataSourceType.CHECK_IN: parse_check_in_record,
    DataSourceType.DEPOSIT: parse_deposit_record,
    DataSourceType.ROOM_CHANGE: parse_room_change_record,
    DataSourceType.INVENTORY_DIFF: parse_inventory_diff_record,
    DataSourceType.REFUND: parse_refund_record
}


def create_import_record(
    db: Session,
    record_data: ImportRecordCreate
) -> ImportRecord:
    record = ImportRecord(
        source_file=record_data.source_file,
        source_type=record_data.source_type,
        original_row_number=record_data.original_row_number,
        original_data=record_data.original_data,
        parsed_data=record_data.parsed_data,
        import_batch_no=record_data.import_batch_no,
        imported_by=record_data.imported_by,
        remark=record_data.remark,
        is_used=False
    )
    db.add(record)
    db.flush()
    return record


def batch_import_records(
    db: Session,
    source_type: DataSourceType,
    source_file: str,
    records: List[Dict[str, Any]],
    import_batch_no: Optional[str] = None,
    imported_by: str = "system",
    auto_create_compensation: bool = True
) -> Tuple[str, int, int, List[Dict[str, Any]]]:
    if not import_batch_no:
        import_batch_no = generate_batch_no()
    
    parse_func = PARSE_FUNCTIONS.get(source_type)
    if not parse_func:
        raise ValueError(f"不支持的数据类型: {source_type}")
    
    success_count = 0
    failed_records = []
    
    import_record_ids = []
    
    for idx, raw_data in enumerate(records, start=1):
        try:
            parsed_data = parse_func(raw_data)
            
            import_record = create_import_record(
                db,
                ImportRecordCreate(
                    source_file=source_file,
                    source_type=source_type,
                    original_row_number=idx,
                    original_data=raw_data,
                    parsed_data=parsed_data,
                    import_batch_no=import_batch_no,
                    imported_by=imported_by
                )
            )
            import_record_ids.append(import_record.id)
            success_count += 1
            
        except Exception as e:
            failed_records.append({
                "row_number": idx,
                "raw_data": raw_data,
                "error": str(e)
            })
    
    record_operation_log(
        db,
        operation_type=OperationType.IMPORT,
        operator=imported_by,
        operation_detail={
            "source_type": source_type.value,
            "source_file": source_file,
            "import_batch_no": import_batch_no,
            "total_count": len(records),
            "success_count": success_count,
            "failed_count": len(failed_records)
        }
    )
    
    db.commit()
    
    if auto_create_compensation and success_count > 0:
        for record_id in import_record_ids:
            import_record = db.query(ImportRecord).filter(
                ImportRecord.id == record_id
            ).first()
            if import_record and not import_record.is_used:
                try:
                    _create_compensation_from_import(db, import_record)
                except Exception:
                    pass
    
    return import_batch_no, len(records), success_count, failed_records


def _create_compensation_from_import(
    db: Session,
    import_record: ImportRecord
) -> Optional[CompensationQueue]:
    parsed = import_record.parsed_data
    source_type = import_record.source_type
    
    amount = 0
    deposit_amount = float(parsed.get("deposit_amount", 0) or 0)
    invoice_amount = float(parsed.get("invoice_amount", 0) or 0)
    
    if source_type == DataSourceType.CHECK_IN:
        amount = float(parsed.get("amount", 0) or 0)
    elif source_type == DataSourceType.DEPOSIT:
        amount = deposit_amount
    elif source_type == DataSourceType.ROOM_CHANGE:
        amount = float(parsed.get("room_price_diff", 0) or 0)
    elif source_type == DataSourceType.INVENTORY_DIFF:
        amount = float(parsed.get("diff_amount", 0) or 0)
    elif source_type == DataSourceType.REFUND:
        amount = -float(parsed.get("refund_amount", 0) or 0)
    
    room_no = parsed.get("room_no") or parsed.get("new_room_no") or ""
    
    compensation_data = CompensationQueueCreate(
        import_record_id=import_record.id,
        source_type=source_type,
        check_in_no=parsed.get("check_in_no", ""),
        room_no=room_no,
        guest_name=parsed.get("guest_name", ""),
        amount=amount,
        deposit_amount=deposit_amount,
        invoice_amount=invoice_amount,
        extra_data={
            "import_batch_no": import_record.import_batch_no,
            "parsed_data": parsed
        }
    )
    
    return create_compensation(db, compensation_data)


def get_import_records_by_batch(
    db: Session,
    import_batch_no: str
) -> List[ImportRecord]:
    return db.query(ImportRecord).filter(
        ImportRecord.import_batch_no == import_batch_no
    ).order_by(ImportRecord.original_row_number.asc()).all()


def get_import_record(
    db: Session,
    record_id: int
) -> Optional[ImportRecord]:
    return db.query(ImportRecord).filter(ImportRecord.id == record_id).first()


def list_import_records(
    db: Session,
    source_type: Optional[DataSourceType] = None,
    import_batch_no: Optional[str] = None,
    is_used: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[ImportRecord], int]:
    query = db.query(ImportRecord)
    
    if source_type:
        query = query.filter(ImportRecord.source_type == source_type)
    if import_batch_no:
        query = query.filter(ImportRecord.import_batch_no == import_batch_no)
    if is_used is not None:
        query = query.filter(ImportRecord.is_used == is_used)
    
    total = query.count()
    items = query.order_by(ImportRecord.imported_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return items, total
