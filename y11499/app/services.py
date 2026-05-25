import hashlib
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from . import models, schemas


VALID_TRANSITIONS: Dict[models.ReimbursementStatus, Set[models.ReimbursementStatus]] = {
    models.ReimbursementStatus.DRAFT: {
        models.ReimbursementStatus.SUBMITTED,
        models.ReimbursementStatus.AUDIT_ONLY,
    },
    models.ReimbursementStatus.SUBMITTED: {
        models.ReimbursementStatus.REJECTED,
        models.ReimbursementStatus.SECOND_CONFIRM,
        models.ReimbursementStatus.APPROVED,
        models.ReimbursementStatus.DRAFT,
    },
    models.ReimbursementStatus.REJECTED: {
        models.ReimbursementStatus.SUBMITTED,
        models.ReimbursementStatus.DRAFT,
    },
    models.ReimbursementStatus.SECOND_CONFIRM: {
        models.ReimbursementStatus.APPROVED,
        models.ReimbursementStatus.REJECTED,
        models.ReimbursementStatus.SUBMITTED,
    },
    models.ReimbursementStatus.AUDIT_ONLY: {
        models.ReimbursementStatus.DRAFT,
    },
    models.ReimbursementStatus.APPROVED: {
        models.ReimbursementStatus.PAID,
        models.ReimbursementStatus.REJECTED,
    },
    models.ReimbursementStatus.PAID: set(),
}


STATUS_PERMISSIONS: Dict[models.ReimbursementStatus, List[models.UserRole]] = {
    models.ReimbursementStatus.DRAFT: [
        models.UserRole.EMPLOYEE,
        models.UserRole.MANAGER,
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.SUBMITTED: [
        models.UserRole.EMPLOYEE,
        models.UserRole.MANAGER,
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.REJECTED: [
        models.UserRole.MANAGER,
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.SECOND_CONFIRM: [
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.AUDIT_ONLY: [
        models.UserRole.AUDITOR,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.APPROVED: [
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
    models.ReimbursementStatus.PAID: [
        models.UserRole.FINANCE,
        models.UserRole.ADMIN,
    ],
}


def validate_status_transition(
    current_status: models.ReimbursementStatus,
    target_status: models.ReimbursementStatus,
    user_role: models.UserRole,
) -> Tuple[bool, Optional[str]]:
    allowed_next = VALID_TRANSITIONS.get(current_status, set())
    if target_status not in allowed_next:
        valid_next = [s.value for s in allowed_next]
        return False, f"状态 {current_status.value} 不允许转换为 {target_status.value}，合法的下一状态为: {', '.join(valid_next) if valid_next else '无'}"
    
    allowed_roles = STATUS_PERMISSIONS.get(target_status, [])
    if user_role not in allowed_roles:
        return False, f"角色 {user_role.value} 无权将状态变更为 {target_status.value}，需要的角色为: {', '.join(r.value for r in allowed_roles)}"
    
    return True, None


def generate_idempotency_key(data: Dict[str, Any]) -> str:
    sorted_data = json.dumps(data, sort_keys=True)
    return hashlib.sha256(sorted_data.encode()).hexdigest()


def generate_batch_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = str(uuid.uuid4())[:8].upper()
    return f"BATCH-{timestamp}-{random_str}"


def generate_reimbursement_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = str(uuid.uuid4())[:6].upper()
    return f"REIMB-{timestamp}-{random_str}"


def log_audit(
    db: Session,
    reimbursement_id: Optional[int],
    actor_id: int,
    action: str,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    change_reason: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> models.AuditLog:
    audit_log = models.AuditLog(
        reimbursement_id=reimbursement_id,
        actor_id=actor_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        change_reason=change_reason,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def detect_duplicate_invoice(db: Session, invoice_data: schemas.InvoiceCreate) -> Optional[models.Invoice]:
    if invoice_data.invoice_number and invoice_data.invoice_code:
        existing = db.query(models.Invoice).filter(
            and_(
                models.Invoice.invoice_number == invoice_data.invoice_number,
                models.Invoice.invoice_code == invoice_data.invoice_code,
                models.Invoice.is_duplicate == False
            )
        ).first()
        if existing:
            return existing
    
    if hasattr(invoice_data, 'pdf_hash') and invoice_data.pdf_hash:
        existing = db.query(models.Invoice).filter(
            and_(
                models.Invoice.pdf_hash == invoice_data.pdf_hash,
                models.Invoice.is_duplicate == False
            )
        ).first()
        if existing:
            return existing
    
    return None


def detect_duplicate_payment(db: Session, payment_data: schemas.PaymentFlowCreate) -> Optional[models.PaymentFlow]:
    if payment_data.transaction_no:
        existing = db.query(models.PaymentFlow).filter(
            and_(
                models.PaymentFlow.transaction_no == payment_data.transaction_no,
                models.PaymentFlow.is_duplicate == False
            )
        ).first()
        if existing:
            return existing
    
    flow_hash = hashlib.sha256(
        f"{payment_data.pay_amount}-{payment_data.pay_time}-{payment_data.payee}".encode()
    ).hexdigest()
    
    existing = db.query(models.PaymentFlow).filter(
        and_(
            models.PaymentFlow.flow_hash == flow_hash,
            models.PaymentFlow.is_duplicate == False
        )
    ).first()
    
    return existing


def get_or_create_reimbursement_by_key(
    db: Session,
    idempotency_key: str,
    reimbursement_data: schemas.ReimbursementCreate,
    creator_id: int,
    batch_id: Optional[int] = None
) -> Tuple[models.Reimbursement, bool]:
    existing = db.query(models.Reimbursement).filter(
        models.Reimbursement.idempotency_key == idempotency_key
    ).first()
    
    if existing:
        return existing, False
    
    new_reimbursement = models.Reimbursement(
        reimbursement_no=reimbursement_data.reimbursement_no or generate_reimbursement_no(),
        batch_id=batch_id,
        creator_id=creator_id,
        applicant_id=reimbursement_data.applicant_id,
        department=reimbursement_data.department,
        purpose=reimbursement_data.purpose,
        total_amount=reimbursement_data.total_amount,
        status=models.ReimbursementStatus.DRAFT,
        travel_start_date=reimbursement_data.travel_start_date,
        travel_end_date=reimbursement_data.travel_end_date,
        travel_destination=reimbursement_data.travel_destination,
        traveler_names=reimbursement_data.traveler_names,
        idempotency_key=idempotency_key
    )
    db.add(new_reimbursement)
    db.commit()
    db.refresh(new_reimbursement)
    
    return new_reimbursement, True


def process_batch_import(
    db: Session,
    batch_data: schemas.BatchImportRequest,
    creator_id: int
) -> schemas.BatchImportResponse:
    batch = models.Batch(
        batch_number=generate_batch_number(),
        name=batch_data.batch_name,
        description=batch_data.batch_description,
        strategy=batch_data.strategy,
        creator_id=creator_id,
        status="processing",
        total_items=len(batch_data.reimbursements)
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    created_count = 0
    updated_count = 0
    ignored_count = 0
    failed_count = 0
    failed_items = []
    
    for idx, reimbursement_data in enumerate(batch_data.reimbursements):
        try:
            if reimbursement_data.idempotency_key:
                idempotency_key = reimbursement_data.idempotency_key
            else:
                key_data = {
                    "purpose": reimbursement_data.purpose,
                    "total_amount": reimbursement_data.total_amount,
                    "travelers": reimbursement_data.traveler_names,
                    "invoices": [inv.dict() for inv in (reimbursement_data.invoices or [])]
                }
                idempotency_key = generate_idempotency_key(key_data)
            
            existing, is_new = get_or_create_reimbursement_by_key(
                db, idempotency_key, reimbursement_data, creator_id, batch.id
            )
            
            if is_new:
                created_count += 1
                _populate_reimbursement_details(db, existing, reimbursement_data, creator_id)
            else:
                if batch_data.strategy == schemas.BatchStrategy.IGNORE:
                    ignored_count += 1
                elif batch_data.strategy == schemas.BatchStrategy.OVERWRITE:
                    updated_count += 1
                    _update_reimbursement_details(db, existing, reimbursement_data, creator_id)
                elif batch_data.strategy == schemas.BatchStrategy.APPEND:
                    updated_count += 1
                    _append_reimbursement_details(db, existing, reimbursement_data, creator_id)
            
            batch.processed_items = created_count + updated_count + ignored_count
            
        except Exception as e:
            failed_count += 1
            failed_items.append({
                "index": idx,
                "error": str(e),
                "reimbursement_no": reimbursement_data.reimbursement_no
            })
    
    batch.failed_items = failed_count
    batch.status = "completed"
    batch.completed_at = datetime.now()
    db.commit()
    
    return schemas.BatchImportResponse(
        batch_id=batch.id,
        batch_number=batch.batch_number,
        total_items=len(batch_data.reimbursements),
        created_count=created_count,
        updated_count=updated_count,
        ignored_count=ignored_count,
        failed_count=failed_count,
        failed_items=failed_items
    )


def _populate_reimbursement_details(
    db: Session,
    reimbursement: models.Reimbursement,
    data: schemas.ReimbursementCreate,
    creator_id: int
):
    for inv_data in (data.invoices or []):
        duplicate_of = detect_duplicate_invoice(db, inv_data)
        invoice = models.Invoice(
            reimbursement_id=reimbursement.id,
            invoice_number=inv_data.invoice_number,
            invoice_code=inv_data.invoice_code,
            invoice_date=inv_data.invoice_date,
            seller_name=inv_data.seller_name,
            seller_tax_no=inv_data.seller_tax_no,
            buyer_name=inv_data.buyer_name,
            buyer_tax_no=inv_data.buyer_tax_no,
            total_amount=inv_data.total_amount,
            tax_amount=inv_data.tax_amount,
            amount_with_tax=inv_data.amount_with_tax,
            category=inv_data.category,
            expense_type=inv_data.expense_type,
            is_duplicate=duplicate_of is not None,
            duplicate_of=duplicate_of.id if duplicate_of else None,
            parsed_data=inv_data.parsed_data
        )
        db.add(invoice)
    
    for ta_data in (data.travel_applications or []):
        ta = models.TravelApplication(
            reimbursement_id=reimbursement.id,
            application_no=ta_data.application_no,
            applicant=ta_data.applicant,
            department=ta_data.department,
            purpose=ta_data.purpose,
            start_date=ta_data.start_date,
            end_date=ta_data.end_date,
            destination=ta_data.destination,
            travelers=ta_data.travelers,
            estimated_amount=ta_data.estimated_amount,
            approved_by=ta_data.approved_by,
            approved_at=ta_data.approved_at,
            form_data=ta_data.form_data
        )
        db.add(ta)
    
    for pf_data in (data.payment_flows or []):
        duplicate_of = detect_duplicate_payment(db, pf_data)
        flow_hash = hashlib.sha256(
            f"{pf_data.pay_amount}-{pf_data.pay_time}-{pf_data.payee}".encode()
        ).hexdigest()
        pf = models.PaymentFlow(
            reimbursement_id=reimbursement.id,
            transaction_no=pf_data.transaction_no,
            pay_time=pf_data.pay_time,
            pay_amount=pf_data.pay_amount,
            payer=pf_data.payer,
            payee=pf_data.payee,
            payment_method=pf_data.payment_method,
            bank_name=pf_data.bank_name,
            bank_account=pf_data.bank_account,
            purpose=pf_data.purpose,
            flow_hash=flow_hash,
            is_duplicate=duplicate_of is not None,
            raw_data=pf_data.raw_data
        )
        db.add(pf)
    
    for ev_data in (data.evidences or []):
        ev = models.Evidence(
            batch_id=reimbursement.batch_id,
            reimbursement_id=reimbursement.id,
            evidence_type=ev_data.evidence_type,
            file_name=ev_data.file_name,
            file_path=ev_data.file_path,
            file_hash=ev_data.file_hash,
            file_size=ev_data.file_size,
            parsed_content=ev_data.parsed_content,
            ocr_text=ev_data.ocr_text
        )
        db.add(ev)
    
    db.commit()


def _update_reimbursement_details(
    db: Session,
    reimbursement: models.Reimbursement,
    data: schemas.ReimbursementCreate,
    creator_id: int
):
    db.query(models.Invoice).filter(models.Invoice.reimbursement_id == reimbursement.id).delete()
    db.query(models.TravelApplication).filter(models.TravelApplication.reimbursement_id == reimbursement.id).delete()
    db.query(models.PaymentFlow).filter(models.PaymentFlow.reimbursement_id == reimbursement.id).delete()
    
    _populate_reimbursement_details(db, reimbursement, data, creator_id)
    
    log_audit(
        db, reimbursement.id, creator_id,
        action="batch_overwrite",
        change_reason="Batch import overwrite"
    )


def _append_reimbursement_details(
    db: Session,
    reimbursement: models.Reimbursement,
    data: schemas.ReimbursementCreate,
    creator_id: int
):
    _populate_reimbursement_details(db, reimbursement, data, creator_id)
    
    log_audit(
        db, reimbursement.id, creator_id,
        action="batch_append",
        change_reason="Batch import append"
    )


def change_reimbursement_status(
    db: Session,
    reimbursement_id: int,
    new_status: schemas.ReimbursementStatus,
    actor_id: int,
    user_role: models.UserRole,
    reason: Optional[str] = None,
    change_reason: Optional[str] = None
) -> models.Reimbursement:
    reimbursement = db.query(models.Reimbursement).filter(
        models.Reimbursement.id == reimbursement_id
    ).first()
    
    if not reimbursement:
        raise ValueError(f"Reimbursement {reimbursement_id} not found")
    
    old_status = reimbursement.status
    
    is_valid, error_msg = validate_status_transition(old_status, new_status, user_role)
    if not is_valid:
        raise PermissionError(error_msg)
    
    old_values = {"status": old_status.value}
    new_values = {"status": new_status.value}
    
    reimbursement.status = new_status
    
    if new_status == schemas.ReimbursementStatus.REJECTED:
        reimbursement.reject_reason = reason
        new_values["reject_reason"] = reason
    elif new_status == schemas.ReimbursementStatus.SECOND_CONFIRM:
        reimbursement.second_confirm_note = reason
        new_values["second_confirm_note"] = reason
    elif new_status == schemas.ReimbursementStatus.SUBMITTED:
        reimbursement.submitted_at = datetime.now()
        new_values["submitted_at"] = reimbursement.submitted_at.isoformat()
    elif new_status == schemas.ReimbursementStatus.APPROVED:
        reimbursement.approved_at = datetime.now()
        new_values["approved_at"] = reimbursement.approved_at.isoformat()
    elif new_status == schemas.ReimbursementStatus.PAID:
        new_values["paid_at"] = datetime.now().isoformat()
    
    db.commit()
    db.refresh(reimbursement)
    
    log_audit(
        db, reimbursement_id, actor_id,
        action=f"status_change:{old_status.value}->{new_status.value}",
        old_values=old_values,
        new_values=new_values,
        change_reason=change_reason
    )
    
    return reimbursement


def make_json_serializable(obj):
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif hasattr(obj, 'dict'):
        return make_json_serializable(obj.dict())
    return obj


def create_async_task(
    db: Session,
    task_type: str,
    payload: Dict[str, Any],
    batch_id: Optional[int] = None,
    max_retries: int = 3
) -> models.AsyncTask:
    task = models.AsyncTask(
        task_id=str(uuid.uuid4()),
        batch_id=batch_id,
        task_type=task_type,
        status=models.TaskStatus.PENDING,
        payload=make_json_serializable(payload),
        max_retries=max_retries
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task_status(
    db: Session,
    task_id: str,
    status: models.TaskStatus,
    result: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    error_stack: Optional[str] = None
) -> models.AsyncTask:
    task = db.query(models.AsyncTask).filter(models.AsyncTask.task_id == task_id).first()
    if not task:
        raise ValueError(f"Task {task_id} not found")
    
    task.status = status
    
    if status == models.TaskStatus.PROCESSING:
        task.started_at = datetime.now()
    elif status in [models.TaskStatus.COMPLETED, models.TaskStatus.PERMANENT_FAILED]:
        task.completed_at = datetime.now()
    
    if result:
        task.result = result
    if error_message:
        task.error_message = error_message
    if error_stack:
        task.error_stack = error_stack
    
    if status == models.TaskStatus.WAIT_RETRY:
        task.retry_count += 1
        task.next_retry_at = datetime.now() + timedelta(minutes=5 * task.retry_count)
        
        if task.retry_count >= task.max_retries:
            task.status = models.TaskStatus.PERMANENT_FAILED
    
    db.commit()
    db.refresh(task)
    return task


def get_finance_dashboard_data(db: Session) -> schemas.FinanceDashboardResponse:
    role_views = []
    for role in [models.UserRole.EMPLOYEE, models.UserRole.MANAGER, models.UserRole.FINANCE]:
        reimbs = db.query(models.Reimbursement).join(
            models.User, models.Reimbursement.creator_id == models.User.id
        ).filter(models.User.role == role).all()
        
        role_views.append(schemas.RoleViewReport(
            role=role.value,
            total_reimbursements=len(reimbs),
            draft_count=sum(1 for r in reimbs if r.status == models.ReimbursementStatus.DRAFT),
            submitted_count=sum(1 for r in reimbs if r.status == models.ReimbursementStatus.SUBMITTED),
            approved_count=sum(1 for r in reimbs if r.status == models.ReimbursementStatus.APPROVED),
            rejected_count=sum(1 for r in reimbs if r.status == models.ReimbursementStatus.REJECTED),
            total_amount=sum(r.total_amount for r in reimbs),
            pending_review_count=sum(1 for r in reimbs if r.status in [
                models.ReimbursementStatus.SUBMITTED,
                models.ReimbursementStatus.SECOND_CONFIRM
            ])
        ))
    
    change_reasons = db.query(
        models.AuditLog.change_reason,
        models.AuditLog.reimbursement_id
    ).filter(models.AuditLog.change_reason.isnot(None)).all()
    
    reason_counts = {}
    for reason, reimb_id in change_reasons:
        if reason not in reason_counts:
            reason_counts[reason] = {"count": 0, "amount": 0}
        reason_counts[reason]["count"] += 1
        reimb = db.query(models.Reimbursement).filter(models.Reimbursement.id == reimb_id).first()
        if reimb:
            reason_counts[reason]["amount"] += reimb.total_amount
    
    top_reasons = [
        schemas.ChangeReasonStats(reason=k, count=v["count"], total_amount=v["amount"])
        for k, v in sorted(reason_counts.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    ]
    
    pending_second_confirm = db.query(models.Reimbursement).filter(
        models.Reimbursement.status == models.ReimbursementStatus.SECOND_CONFIRM
    ).count()
    
    duplicate_invoices = db.query(models.Invoice).filter(models.Invoice.is_duplicate == True).count()
    duplicate_payments = db.query(models.PaymentFlow).filter(models.PaymentFlow.is_duplicate == True).count()
    
    sensitive_stats = get_sensitive_field_stats(db)
    
    return schemas.FinanceDashboardResponse(
        role_views=role_views,
        top_change_reasons=top_reasons,
        sensitive_field_stats=sensitive_stats,
        pending_second_confirm=pending_second_confirm,
        duplicate_invoices=duplicate_invoices,
        duplicate_payments=duplicate_payments
    )


SENSITIVE_FIELDS = {
    "seller_tax_no": {
        "pattern": "***",
        "roles": ["finance", "admin", "auditor"],
        "table": "invoices"
    },
    "buyer_tax_no": {
        "pattern": "***",
        "roles": ["finance", "admin", "auditor"],
        "table": "invoices"
    },
    "bank_account": {
        "pattern": "****",
        "roles": ["finance", "admin"],
        "table": "payment_flows"
    },
}


def log_sensitive_field_access(
    db: Session,
    field_name: str,
    table_name: str,
    record_id: int,
    user_id: int,
    user_role: str,
    access_type: str,
    was_masked: bool,
    ip_address: Optional[str] = None
) -> models.SensitiveFieldAccessLog:
    log = models.SensitiveFieldAccessLog(
        field_name=field_name,
        table_name=table_name,
        record_id=record_id,
        user_id=user_id,
        user_role=user_role,
        access_type=access_type,
        was_masked=was_masked,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def mask_sensitive_fields(
    data: Dict[str, Any],
    user_role: str,
    user_id: Optional[int] = None,
    record_id: Optional[int] = None,
    db: Optional[Session] = None,
    ip_address: Optional[str] = None
) -> Dict[str, Any]:
    result = data.copy()
    
    for field, config in SENSITIVE_FIELDS.items():
        if field in result and result[field]:
            was_masked = user_role not in config["roles"]
            
            if db and user_id:
                log_sensitive_field_access(
                    db, field, config["table"],
                    record_id or 0, user_id, user_role,
                    "read", was_masked, ip_address
                )
            
            if was_masked:
                value = str(result[field])
                if len(value) > 4:
                    result[field] = value[:2] + config["pattern"] + value[-2:]
                else:
                    result[field] = config["pattern"]
    
    return result


def get_sensitive_field_stats(db: Session) -> List[schemas.SensitiveFieldReport]:
    from sqlalchemy import func
    
    stats = db.query(
        models.SensitiveFieldAccessLog.field_name,
        func.count(models.SensitiveFieldAccessLog.id).label("access_count"),
        func.group_concat(func.distinct(models.SensitiveFieldAccessLog.user_role)).label("roles"),
        func.max(models.SensitiveFieldAccessLog.created_at).label("last_access")
    ).group_by(models.SensitiveFieldAccessLog.field_name).all()
    
    result = []
    for stat in stats:
        roles = []
        if stat.roles:
            roles = list(set(stat.roles.split(",")))
        
        result.append(schemas.SensitiveFieldReport(
            field_name=stat.field_name,
            access_count=stat.access_count,
            roles_accessed=roles,
            last_accessed=stat.last_access
        ))
    
    return result
