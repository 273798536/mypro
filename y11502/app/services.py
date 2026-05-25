import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import (
    SourceEvidence, MaintenanceOrder, SparePartScan, CustomerReceipt,
    SupplierStatement, ApprovalEmail,
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


def import_supplier_statements(
    db: Session,
    statements_data: List[Dict[str, Any]],
    source_file: str = "manual_upload"
) -> Tuple[int, int, List[str]]:
    success_count = 0
    failed_count = 0
    errors = []

    for idx, data in enumerate(statements_data, start=1):
        try:
            statement_date = data.get("statement_date")
            if isinstance(statement_date, str):
                statement_date = datetime.fromisoformat(statement_date.replace("Z", "+00:00"))

            parsed_data = {
                "statement_no": str(data.get("statement_no", "")),
                "supplier_name": str(data.get("supplier_name", "")),
                "order_no": str(data.get("order_no", "")),
                "part_code": str(data.get("part_code", "")),
                "quantity": int(data.get("quantity", 0)),
                "unit_price": float(data.get("unit_price", 0)),
                "total_amount": float(data.get("total_amount", 0)),
                "statement_date": statement_date
            }

            evidence = create_source_evidence(
                db, source_file, idx, SourceType.SUPPLIER_STATEMENT,
                data, parsed_data
            )

            existing = db.query(SupplierStatement).filter(
                SupplierStatement.statement_no == parsed_data["statement_no"]
            ).first()

            if existing:
                existing.supplier_name = parsed_data["supplier_name"]
                existing.order_no = parsed_data["order_no"]
                existing.part_code = parsed_data["part_code"]
                existing.quantity = parsed_data["quantity"]
                existing.unit_price = parsed_data["unit_price"]
                existing.total_amount = parsed_data["total_amount"]
                existing.statement_date = parsed_data["statement_date"]
                existing.source_evidence_id = evidence.id
            else:
                statement = SupplierStatement(
                    **parsed_data,
                    source_evidence_id=evidence.id
                )
                db.add(statement)

            success_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {idx}: {str(e)}")

    db.commit()
    return success_count, failed_count, errors


def import_approval_emails(
    db: Session,
    emails_data: List[Dict[str, Any]],
    source_file: str = "manual_upload"
) -> Tuple[int, int, List[str]]:
    success_count = 0
    failed_count = 0
    errors = []

    for idx, data in enumerate(emails_data, start=1):
        try:
            sent_at = data.get("sent_at")
            if isinstance(sent_at, str):
                sent_at = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))

            parsed_data = {
                "email_id": str(data.get("email_id", "")),
                "subject": str(data.get("subject", "")),
                "sender": str(data.get("sender", "")),
                "recipient": str(data.get("recipient", "")),
                "order_no": str(data.get("order_no", "")),
                "approval_status": str(data.get("approval_status", "pending")),
                "approval_note": str(data.get("approval_note", "")),
                "approver": str(data.get("approver", "")),
                "sent_at": sent_at
            }

            evidence = create_source_evidence(
                db, source_file, idx, SourceType.APPROVAL_EMAIL,
                data, parsed_data
            )

            existing = db.query(ApprovalEmail).filter(
                ApprovalEmail.email_id == parsed_data["email_id"]
            ).first()

            if existing:
                existing.subject = parsed_data["subject"]
                existing.sender = parsed_data["sender"]
                existing.recipient = parsed_data["recipient"]
                existing.order_no = parsed_data["order_no"]
                existing.approval_status = parsed_data["approval_status"]
                existing.approval_note = parsed_data["approval_note"]
                existing.approver = parsed_data["approver"]
                existing.sent_at = parsed_data["sent_at"]
                existing.source_evidence_id = evidence.id
            else:
                email = ApprovalEmail(
                    **parsed_data,
                    source_evidence_id=evidence.id
                )
                db.add(email)

            success_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {idx}: {str(e)}")

    db.commit()
    return success_count, failed_count, errors


def get_all_pending_items(db: Session) -> List[CompensationQueue]:
    now = datetime.utcnow()
    return db.query(CompensationQueue).filter(
        or_(
            CompensationQueue.status == QueueStatus.PENDING,
            and_(
                CompensationQueue.status == QueueStatus.RETRYING,
                CompensationQueue.next_retry_at <= now
            )
        )
    ).order_by(CompensationQueue.created_at).all()


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

    if queue.status not in [QueueStatus.PENDING, QueueStatus.RETRYING, QueueStatus.WAITING_MANUAL]:
        return False

    update_queue_status(db, queue_id, QueueStatus.PROCESSING, "system", "开始处理补偿")

    try:
        success, message = _execute_compensation_logic(db, queue)

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
            raise Exception(message)

    except Exception as e:
        queue.retry_count += 1
        queue.last_error = str(e)

        if "等供应商对账单" in str(e) or "等审批邮件" in str(e):
            update_queue_status(
                db, queue_id, QueueStatus.WAITING_MANUAL,
                "system", f"等待外部回执: {str(e)}", str(e)
            )
        elif queue.retry_count >= queue.max_retry:
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


def _execute_compensation_logic(db: Session, queue: CompensationQueue) -> Tuple[bool, str]:
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
        return False, f"维修单不存在: {queue.order_no}"
    if not scan:
        return False, f"备件扫码记录不存在: {queue.part_code}"
    if not receipt:
        return False, f"客户签收记录不存在: {queue.order_no}"

    statement = db.query(SupplierStatement).filter(
        and_(
            SupplierStatement.order_no == queue.order_no,
            SupplierStatement.part_code == queue.part_code
        )
    ).first()

    if not statement:
        return False, f"等供应商对账单: {queue.order_no}-{queue.part_code}"

    approval = db.query(ApprovalEmail).filter(
        and_(
            ApprovalEmail.order_no == queue.order_no,
            ApprovalEmail.approval_status == "approved"
        )
    ).first()

    if not approval:
        return False, f"等审批邮件: {queue.order_no}"

    return True, "验证通过"


def create_queue_async_task(db: Session, queue_id: int) -> AsyncTask:
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise Exception(f"队列项不存在: {queue_id}")

    payload = {
        "queue_id": queue.id,
        "order_no": queue.order_no,
        "part_code": queue.part_code,
        "quantity": queue.quantity,
        "operation": "process_compensation"
    }

    return create_async_task(db, "queue_process", payload)


def execute_async_task(db: Session, task_id: int) -> bool:
    task = db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
    if not task:
        return False

    if task.status not in [TaskStatus.WAITING_RETRY, TaskStatus.WAITING_MANUAL]:
        return False

    task.last_run_at = datetime.utcnow()
    task.retry_count += 1

    try:
        payload = json.loads(task.payload)
        operation = payload.get("operation")

        if operation == "process_compensation":
            queue_id = payload.get("queue_id")
            success = process_queue_item(db, queue_id)

            if success:
                task.status = TaskStatus.COMPLETED
                task.error_message = None
                task.next_run_at = None
                db.commit()
                return True
            else:
                queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
                if queue:
                    last_error = queue.last_error or ""
                    task.error_message = last_error

                    if "等供应商对账单" in last_error or "等审批邮件" in last_error:
                        task.status = TaskStatus.WAITING_MANUAL
                        update_queue_status(
                            db, queue_id, QueueStatus.WAITING_MANUAL,
                            "system", f"等待外部回执: {last_error}"
                        )
                    elif queue.status == QueueStatus.DEAD_LETTER:
                        task.status = TaskStatus.PERMANENT_FAILED
                    else:
                        task.status = TaskStatus.WAITING_RETRY
                        task.next_run_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
                else:
                    task.status = TaskStatus.WAITING_RETRY
                    task.next_run_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
        else:
            raise Exception(f"未知操作类型: {operation}")

    except Exception as e:
        task.error_message = str(e)
        if task.retry_count >= task.max_retry:
            task.status = TaskStatus.PERMANENT_FAILED
            task.next_run_at = None
        else:
            task.status = TaskStatus.WAITING_RETRY
            task.next_run_at = datetime.utcnow() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task.status == TaskStatus.COMPLETED


def get_pending_async_tasks(db: Session) -> List[AsyncTask]:
    now = datetime.utcnow()
    return db.query(AsyncTask).filter(
        and_(
            AsyncTask.status.in_([TaskStatus.WAITING_RETRY, TaskStatus.WAITING_MANUAL]),
            AsyncTask.next_run_at <= now
        )
    ).order_by(AsyncTask.next_run_at).all()


def process_all_pending_async_tasks(db: Session) -> Tuple[int, int, int]:
    tasks = get_pending_async_tasks(db)
    success_count = 0
    manual_count = 0
    failed_count = 0

    for task in tasks:
        success = execute_async_task(db, task.id)
        if success:
            success_count += 1
        elif task.status == TaskStatus.WAITING_MANUAL:
            manual_count += 1
        else:
            failed_count += 1

    return success_count, manual_count, failed_count


def recover_queue_from_async_tasks(db: Session) -> int:
    tasks = db.query(AsyncTask).filter(
        AsyncTask.status == TaskStatus.WAITING_RETRY
    ).all()

    recovered = 0
    for task in tasks:
        try:
            payload = json.loads(task.payload)
            queue_id = payload.get("queue_id")
            if queue_id:
                queue = db.query(CompensationQueue).filter(
                    CompensationQueue.id == queue_id
                ).first()
                if queue and queue.status in [QueueStatus.PROCESSING, QueueStatus.RETRYING]:
                    queue.status = QueueStatus.PENDING
                    queue.updated_at = datetime.utcnow()
                    db.add(AuditLog(
                        queue_id=queue_id,
                        action="recovery",
                        old_status=queue.status,
                        new_status=QueueStatus.PENDING,
                        operator="system",
                        remark=f"服务恢复，重置队列状态: 任务ID={task.task_id}"
                    ))
                    recovered += 1
        except Exception as e:
            task.error_message = f"恢复失败: {str(e)}"
            task.status = TaskStatus.PERMANENT_FAILED

    db.commit()
    return recovered


def mark_queue_waiting_manual(
    db: Session,
    queue_id: int,
    reason: str,
    operator: str = "system"
) -> Optional[CompensationQueue]:
    return update_queue_status(
        db, queue_id, QueueStatus.WAITING_MANUAL,
        operator, f"人工干预: {reason}"
    )


def mark_queue_permanent_failed(
    db: Session,
    queue_id: int,
    reason: str,
    operator: str = "system"
) -> Optional[CompensationQueue]:
    queue = update_queue_status(
        db, queue_id, QueueStatus.DEAD_LETTER,
        operator, f"永久失败: {reason}"
    )
    if queue:
        tasks = db.query(AsyncTask).filter(
            AsyncTask.payload.like(f'%"queue_id": {queue_id}%')
        ).all()
        for task in tasks:
            task.status = TaskStatus.PERMANENT_FAILED
            task.updated_at = datetime.utcnow()
        db.commit()
    return queue


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
