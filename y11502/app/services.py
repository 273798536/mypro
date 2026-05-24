import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import (
    SourceEvidence, MaintenanceOrder, SparePartScan, CustomerReceipt,
    CompensationQueue, CompensationRecord, AuditLog, AsyncTask,
    SourceType, QueueStatus, TaskStatus
)
from app.schemas import (
    MaintenanceOrderCreate, SparePartScanCreate, CustomerReceiptCreate,
    CompensationQueueCreate
)
from app.config import settings


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def json_dumps_safe(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder)


def generate_idempotent_key(order_no: str, part_code: str, quantity: int) -> str:
    key_string = f"{order_no}:{part_code}:{quantity}"
    return hashlib.md5(key_string.encode()).hexdigest()


def create_source_evidence(
    db: Session,
    source_file: str,
    source_line: int,
    source_type: SourceType,
    raw_data: Dict[str, Any],
    parsed_value: Dict[str, Any]
) -> SourceEvidence:
    evidence = SourceEvidence(
        source_file=source_file,
        source_line=source_line,
        source_type=source_type.value,
        raw_data=json_dumps_safe(raw_data),
        parsed_value=json_dumps_safe(parsed_value)
    )
    db.add(evidence)
    db.flush()
    return evidence


def import_maintenance_orders(
    db: Session,
    orders_data: List[Dict[str, Any]],
    source_file: str = "manual_upload"
) -> Tuple[int, int, List[str]]:
    success_count = 0
    failed_count = 0
    errors = []

    for idx, data in enumerate(orders_data, start=1):
        try:
            parsed_data = {
                "order_no": str(data.get("order_no", "")),
                "customer_name": str(data.get("customer_name", "")),
                "product_model": str(data.get("product_model", "")),
                "fault_description": str(data.get("fault_description", ""))
            }

            evidence = create_source_evidence(
                db, source_file, idx, SourceType.MAINTENANCE_ORDER,
                data, parsed_data
            )

            existing = db.query(MaintenanceOrder).filter(
                MaintenanceOrder.order_no == parsed_data["order_no"]
            ).first()

            if existing:
                existing.customer_name = parsed_data["customer_name"]
                existing.product_model = parsed_data["product_model"]
                existing.fault_description = parsed_data["fault_description"]
                existing.source_evidence_id = evidence.id
            else:
                order = MaintenanceOrder(
                    **parsed_data,
                    source_evidence_id=evidence.id
                )
                db.add(order)

            success_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {idx}: {str(e)}")

    db.commit()
    return success_count, failed_count, errors


def import_spare_part_scans(
    db: Session,
    scans_data: List[Dict[str, Any]],
    source_file: str = "manual_upload"
) -> Tuple[int, int, List[str]]:
    success_count = 0
    failed_count = 0
    errors = []

    for idx, data in enumerate(scans_data, start=1):
        try:
            scan_time = data.get("scan_time")
            if isinstance(scan_time, str):
                scan_time = datetime.fromisoformat(scan_time.replace("Z", "+00:00"))

            parsed_data = {
                "scan_no": str(data.get("scan_no", "")),
                "part_code": str(data.get("part_code", "")),
                "part_name": str(data.get("part_name", "")),
                "quantity": int(data.get("quantity", 0)),
                "scan_time": scan_time,
                "operator": str(data.get("operator", ""))
            }

            evidence = create_source_evidence(
                db, source_file, idx, SourceType.SPARE_PART_SCAN,
                data, parsed_data
            )

            existing = db.query(SparePartScan).filter(
                SparePartScan.scan_no == parsed_data["scan_no"]
            ).first()

            if existing:
                existing.part_code = parsed_data["part_code"]
                existing.part_name = parsed_data["part_name"]
                existing.quantity = parsed_data["quantity"]
                existing.scan_time = parsed_data["scan_time"]
                existing.operator = parsed_data["operator"]
                existing.source_evidence_id = evidence.id
            else:
                scan = SparePartScan(
                    **parsed_data,
                    source_evidence_id=evidence.id
                )
                db.add(scan)

            success_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {idx}: {str(e)}")

    db.commit()
    return success_count, failed_count, errors


def import_customer_receipts(
    db: Session,
    receipts_data: List[Dict[str, Any]],
    source_file: str = "manual_upload"
) -> Tuple[int, int, List[str]]:
    success_count = 0
    failed_count = 0
    errors = []

    for idx, data in enumerate(receipts_data, start=1):
        try:
            receipt_time = data.get("receipt_time")
            if isinstance(receipt_time, str):
                receipt_time = datetime.fromisoformat(receipt_time.replace("Z", "+00:00"))

            parsed_data = {
                "receipt_no": str(data.get("receipt_no", "")),
                "order_no": str(data.get("order_no", "")),
                "customer_name": str(data.get("customer_name", "")),
                "receipt_time": receipt_time,
                "image_url": str(data.get("image_url", "")),
                "signed_by": str(data.get("signed_by", ""))
            }

            evidence = create_source_evidence(
                db, source_file, idx, SourceType.CUSTOMER_RECEIPT,
                data, parsed_data
            )

            existing = db.query(CustomerReceipt).filter(
                CustomerReceipt.receipt_no == parsed_data["receipt_no"]
            ).first()

            if existing:
                existing.order_no = parsed_data["order_no"]
                existing.customer_name = parsed_data["customer_name"]
                existing.receipt_time = parsed_data["receipt_time"]
                existing.image_url = parsed_data["image_url"]
                existing.signed_by = parsed_data["signed_by"]
                existing.source_evidence_id = evidence.id
            else:
                receipt = CustomerReceipt(
                    **parsed_data,
                    source_evidence_id=evidence.id
                )
                db.add(receipt)

            success_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {idx}: {str(e)}")

    db.commit()
    return success_count, failed_count, errors


def create_compensation_queue(
    db: Session,
    order_no: str,
    part_code: str,
    quantity: int,
    max_retry: int = 3
) -> Tuple[CompensationQueue, bool]:
    idempotent_key = generate_idempotent_key(order_no, part_code, quantity)

    existing = db.query(CompensationQueue).filter(
        CompensationQueue.idempotent_key == idempotent_key
    ).first()

    if existing:
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing, False

    queue_item = CompensationQueue(
        idempotent_key=idempotent_key,
        order_no=order_no,
        part_code=part_code,
        quantity=quantity,
        max_retry=max_retry,
        status=QueueStatus.PENDING
    )
    db.add(queue_item)

    audit_log = AuditLog(
        queue_id=queue_item.id,
        action="create",
        old_status=None,
        new_status=QueueStatus.PENDING,
        operator="system",
        remark=f"创建补偿队列: {order_no}-{part_code}-{quantity}"
    )
    db.add(audit_log)

    db.commit()
    db.refresh(queue_item)
    return queue_item, True


def get_queue_by_idempotent_key(db: Session, idempotent_key: str) -> Optional[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.idempotent_key == idempotent_key
    ).first()


def update_queue_status(
    db: Session,
    queue_id: int,
    new_status: QueueStatus,
    operator: str = "system",
    remark: str = "",
    error: str = None
) -> Optional[CompensationQueue]:
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        return None

    old_status = queue.status
    queue.status = new_status
    queue.updated_at = datetime.utcnow()

    if error:
        queue.last_error = error

    if new_status == QueueStatus.COMPENSATED:
        queue.processed_at = datetime.utcnow()

    audit_log = AuditLog(
        queue_id=queue_id,
        action="status_change",
        old_status=old_status,
        new_status=new_status,
        operator=operator,
        remark=remark
    )
    db.add(audit_log)
    db.commit()
    db.refresh(queue)
    return queue


def process_queue_item(db: Session, queue_id: int) -> bool:
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        return False

    if queue.status not in [QueueStatus.PENDING, QueueStatus.RETRYING]:
        return False

    update_queue_status(db, queue_id, QueueStatus.PROCESSING, "system", "开始处理补偿")

    try:
        success = _execute_compensation_logic(db, queue)

        if success:
            record = CompensationRecord(
                queue_id=queue.id,
                order_no=queue.order_no,
                part_code=queue.part_code,
                quantity=queue.quantity,
                amount=queue.quantity * 100.0,
                operator="system",
                remark="自动补偿入账"
            )
            db.add(record)
            update_queue_status(db, queue_id, QueueStatus.COMPENSATED, "system", "补偿成功")
            return True
        else:
            raise Exception("补偿逻辑执行失败")

    except Exception as e:
        queue.retry_count += 1
        queue.last_error = str(e)

        if queue.retry_count >= queue.max_retry:
            update_queue_status(
                db, queue_id, QueueStatus.DEAD_LETTER,
                "system", f"重试次数耗尽: {queue.retry_count}/{queue.max_retry}", str(e)
            )
        else:
            queue.next_retry_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
            update_queue_status(
                db, queue_id, QueueStatus.RETRYING,
                "system", f"第{queue.retry_count}次重试，下次: {queue.next_retry_at}", str(e)
            )

        return False


def _execute_compensation_logic(db: Session, queue: CompensationQueue) -> bool:
    order = db.query(MaintenanceOrder).filter(
        MaintenanceOrder.order_no == queue.order_no
    ).first()

    scan = db.query(SparePartScan).filter(
        SparePartScan.part_code == queue.part_code
    ).first()

    receipt = db.query(CustomerReceipt).filter(
        CustomerReceipt.order_no == queue.order_no
    ).first()

    if not order:
        raise Exception(f"维修单不存在: {queue.order_no}")
    if not scan:
        raise Exception(f"备件扫码记录不存在: {queue.part_code}")
    if not receipt:
        raise Exception(f"客户签收记录不存在: {queue.order_no}")

    return True


def manual_handle_queue(
    db: Session,
    queue_id: int,
    handler: str,
    note: str,
    action: str
) -> Optional[CompensationQueue]:
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        return None

    queue.manual_handler = handler
    queue.manual_note = note
    queue.updated_at = datetime.utcnow()

    if action == "approve":
        record = CompensationRecord(
            queue_id=queue.id,
            order_no=queue.order_no,
            part_code=queue.part_code,
            quantity=queue.quantity,
            amount=queue.quantity * 100.0,
            operator=handler,
            remark=f"人工审批通过: {note}"
        )
        db.add(record)
        update_queue_status(
            db, queue_id, QueueStatus.COMPENSATED,
            handler, f"人工审批补偿: {note}"
        )
    elif action == "reject":
        update_queue_status(
            db, queue_id, QueueStatus.CLOSED,
            handler, f"人工驳回: {note}"
        )
    elif action == "retry":
        queue.retry_count = 0
        queue.next_retry_at = datetime.utcnow()
        update_queue_status(
            db, queue_id, QueueStatus.RETRYING,
            handler, f"人工触发重试: {note}"
        )

    return queue


def get_pending_retry_items(db: Session) -> List[CompensationQueue]:
    now = datetime.utcnow()
    return db.query(CompensationQueue).filter(
        and_(
            CompensationQueue.status == QueueStatus.RETRYING,
            CompensationQueue.next_retry_at <= now
        )
    ).all()


def get_queue_stats(db: Session) -> Dict[str, int]:
    stats = {}
    for status in QueueStatus:
        count = db.query(CompensationQueue).filter(
            CompensationQueue.status == status
        ).count()
        stats[status.value] = count
    return stats


def get_retry_category_stats(db: Session) -> List[Dict[str, Any]]:
    retrying_items = db.query(CompensationQueue).filter(
        CompensationQueue.status == QueueStatus.RETRYING
    ).all()

    categories = {}
    for item in retrying_items:
        category = item.part_code[:3] if item.part_code else "unknown"
        if category not in categories:
            categories[category] = {"count": 0, "error_types": {}}
        categories[category]["count"] += 1
        error_type = item.last_error.split(":")[0] if item.last_error else "unknown"
        categories[category]["error_types"][error_type] = categories[category]["error_types"].get(error_type, 0) + 1

    result = []
    for cat, data in categories.items():
        result.append({
            "category": cat,
            "count": data["count"],
            "error_types": [{"type": k, "count": v} for k, v in data["error_types"].items()]
        })
    return result


def get_dead_letter_stats(db: Session) -> Dict[str, Any]:
    dead_items = db.query(CompensationQueue).filter(
        CompensationQueue.status == QueueStatus.DEAD_LETTER
    ).order_by(CompensationQueue.created_at).all()

    error_types = {}
    for item in dead_items:
        err_type = item.last_error.split(":")[0] if item.last_error else "unknown"
        error_types[err_type] = error_types.get(err_type, 0) + 1

    return {
        "total": len(dead_items),
        "by_error_type": [{"type": k, "count": v} for k, v in error_types.items()],
        "oldest_entry": dead_items[0].created_at if dead_items else None,
        "newest_entry": dead_items[-1].created_at if dead_items else None
    }


def create_async_task(
    db: Session,
    task_type: str,
    payload: Dict[str, Any]
) -> AsyncTask:
    import uuid
    task = AsyncTask(
        task_id=str(uuid.uuid4()),
        task_type=task_type,
        status=TaskStatus.WAITING_RETRY,
        payload=json.dumps(payload, ensure_ascii=False),
        next_run_at=datetime.utcnow()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def recover_async_tasks(db: Session) -> int:
    now = datetime.utcnow()
    recovered = db.query(AsyncTask).filter(
        and_(
            AsyncTask.status.in_([TaskStatus.WAITING_RETRY, TaskStatus.WAITING_MANUAL]),
            AsyncTask.next_run_at <= now
        )
    ).update({
        AsyncTask.status: TaskStatus.WAITING_RETRY,
        AsyncTask.next_run_at: now
    })
    db.commit()
    return recovered


def get_recovery_stats(db: Session) -> Dict[str, Any]:
    waiting_retry = db.query(AsyncTask).filter(
        AsyncTask.status == TaskStatus.WAITING_RETRY
    ).count()

    waiting_manual = db.query(AsyncTask).filter(
        AsyncTask.status == TaskStatus.WAITING_MANUAL
    ).count()

    last_completed = db.query(AsyncTask).filter(
        AsyncTask.status == TaskStatus.COMPLETED
    ).order_by(AsyncTask.updated_at.desc()).first()

    return {
        "recovered_tasks": waiting_retry,
        "pending_recovery": waiting_manual,
        "last_recovery_at": last_completed.updated_at if last_completed else None
    }
