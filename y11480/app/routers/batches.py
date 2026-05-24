from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.security import get_current_active_user, require_roles
from app.models import UserRole, BatchStatus
from app.state_machine import change_batch_state, freeze_batch, unfreeze_batch, StateTransitionError
from app.idempotency import IdempotencyService
from app.dirty_records import DirtyRecordDetector, validate_sample_label, validate_temperature_record, validate_store_complaint
from app.export_service import ExportService
from app.utils import to_json_serializable
from app.field_permissions import FieldPermissionService

router = APIRouter(prefix="/batches", tags=["批次管理"])


def batch_to_dict(batch: models.Batch, include_nested: bool = True) -> dict:
    result = {
        "id": batch.id,
        "batch_no": batch.batch_no,
        "pot_no": batch.pot_no,
        "product_name": batch.product_name,
        "production_date": batch.production_date,
        "status": batch.status,
        "before_freeze_status": batch.before_freeze_status,
        "freeze_reason": batch.freeze_reason,
        "created_by": batch.created_by,
        "created_at": batch.created_at,
        "updated_at": batch.updated_at,
        "reviewed_by": batch.reviewed_by,
        "reviewed_at": batch.reviewed_at,
        "review_result": batch.review_result,
        "review_comment": batch.review_comment,
        "settled_at": batch.settled_at,
        "settled_by": batch.settled_by,
        "withdrawn_at": batch.withdrawn_at,
        "withdrawn_by": batch.withdrawn_by,
        "withdraw_reason": batch.withdraw_reason,
        "archived_at": batch.archived_at
    }

    if include_nested:
        result["sample_labels"] = [
            {
                "id": sl.id,
                "label_code": sl.label_code,
                "sample_time": sl.sample_time,
                "sampler": sl.sampler,
                "sample_location": sl.sample_location,
                "quantity": sl.quantity,
                "unit": sl.unit,
                "storage_condition": sl.storage_condition,
                "created_at": sl.created_at
            }
            for sl in batch.sample_labels
        ]
        result["temperature_records"] = [
            {
                "id": tr.id,
                "record_time": tr.record_time,
                "temperature": tr.temperature,
                "measure_point": tr.measure_point,
                "recorder": tr.recorder,
                "is_abnormal": tr.is_abnormal,
                "remark": tr.remark,
                "created_at": tr.created_at
            }
            for tr in batch.temperature_records
        ]
        result["store_complaints"] = [
            {
                "id": sc.id,
                "store_name": sc.store_name,
                "store_code": sc.store_code,
                "complaint_time": sc.complaint_time,
                "complaint_type": sc.complaint_type,
                "complaint_content": sc.complaint_content,
                "quantity": sc.quantity,
                "amount": sc.amount,
                "contact_person": sc.contact_person,
                "contact_phone": sc.contact_phone,
                "status": sc.status,
                "created_at": sc.created_at
            }
            for sc in batch.store_complaints
        ]
        result["affected_stores"] = [
            {
                "id": as_.id,
                "store_name": as_.store_name,
                "store_code": as_.store_code,
                "quantity_received": as_.quantity_received,
                "quantity_used": as_.quantity_used,
                "quantity_remaining": as_.quantity_remaining,
                "distribution_time": as_.distribution_time,
                "created_at": as_.created_at
            }
            for as_ in batch.affected_stores
        ]
        result["supervisor_comments"] = [
            {
                "id": sc.id,
                "comment_type": sc.comment_type,
                "content": sc.content,
                "attachment_urls": sc.attachment_urls,
                "created_at": sc.created_at
            }
            for sc in batch.supervisor_comments
        ]
        result["status_history"] = [
            {
                "id": sh.id,
                "from_status": sh.from_status,
                "to_status": sh.to_status,
                "changed_by": sh.changed_by,
                "change_reason": sh.change_reason,
                "created_at": sh.created_at
            }
            for sh in batch.status_history
        ]
        result["dirty_records"] = [
            {
                "id": dr.id,
                "source_type": dr.source_type,
                "source_id": dr.source_id,
                "dirty_type": dr.dirty_type,
                "description": dr.description,
                "raw_content": dr.raw_content,
                "processing_opinion": dr.processing_opinion,
                "is_resolved": dr.is_resolved,
                "created_at": dr.created_at
            }
            for dr in batch.dirty_records
        ]

    return result


def batch_list_to_dict(batch: models.Batch) -> dict:
    return {
        "id": batch.id,
        "batch_no": batch.batch_no,
        "pot_no": batch.pot_no,
        "product_name": batch.product_name,
        "production_date": batch.production_date,
        "status": batch.status,
        "created_at": batch.created_at,
        "sample_label_count": len(batch.sample_labels),
        "temperature_record_count": len(batch.temperature_records),
        "store_complaint_count": len(batch.store_complaints),
        "affected_store_count": len(batch.affected_stores)
    }


@router.get("/")
def list_batches(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BatchStatus] = None,
    pot_no: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> List[dict]:
    query = db.query(models.Batch)
    if status:
        query = query.filter(models.Batch.status == status)
    if pot_no:
        query = query.filter(models.Batch.pot_no == pot_no)

    batches = query.order_by(models.Batch.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for batch in batches:
        batch_dict = batch_list_to_dict(batch)
        filtered_dict = FieldPermissionService.filter_batch_list_fields(batch_dict, current_user.role)
        result.append(filtered_dict)

    return result


@router.post("/")
def create_batch(
    batch_in: schemas.BatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
) -> dict:
    existing = db.query(models.Batch).filter(models.Batch.batch_no == batch_in.batch_no).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"批次号 {batch_in.batch_no} 已存在"
        )

    batch = models.Batch(
        batch_no=batch_in.batch_no,
        pot_no=batch_in.pot_no,
        product_name=batch_in.product_name,
        production_date=batch_in.production_date,
        created_by=current_user.id
    )
    db.add(batch)
    db.flush()

    if batch_in.affected_stores:
        for store_in in batch_in.affected_stores:
            store = models.AffectedStore(
                batch_id=batch.id,
                **store_in.model_dump()
            )
            db.add(store)

    history = models.StatusHistory(
        batch_id=batch.id,
        from_status=None,
        to_status=BatchStatus.CREATED,
        changed_by=current_user.id,
        change_reason="批次创建"
    )
    db.add(history)
    db.commit()
    db.refresh(batch)
    
    batch_dict = batch_to_dict(batch)
    filtered_dict = FieldPermissionService.filter_batch_fields(batch_dict, current_user.role)
    return filtered_dict


@router.get("/{batch_id}")
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> dict:
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    batch_dict = batch_to_dict(batch)
    filtered_dict = FieldPermissionService.filter_batch_fields(batch_dict, current_user.role)
    return filtered_dict


@router.get("/pot/{pot_no}/stores", response_model=List[schemas.AffectedStore])
def get_stores_by_pot(
    pot_no: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    batches = db.query(models.Batch).filter(models.Batch.pot_no == pot_no).all()
    all_stores = []
    seen_stores = set()

    for batch in batches:
        for store in batch.affected_stores:
            store_key = (store.store_code or store.store_name)
            if store_key not in seen_stores:
                seen_stores.add(store_key)
                all_stores.append(store)

    return all_stores


@router.post("/{batch_id}/sample-labels", response_model=schemas.SampleLabel)
def add_sample_label(
    batch_id: int,
    label_in: schemas.SampleLabelCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    detector = DirtyRecordDetector(db)
    data_dict = label_in.model_dump()
    raw_data_to_store = to_json_serializable(label_in.raw_data or data_dict)

    def create_func():
        label = models.SampleLabel(
            batch_id=batch_id,
            label_code=label_in.label_code,
            sample_time=label_in.sample_time,
            sampler=label_in.sampler,
            sample_location=label_in.sample_location,
            quantity=label_in.quantity,
            unit=label_in.unit,
            storage_condition=label_in.storage_condition,
            idempotency_key=label_in.idempotency_key,
            raw_data=raw_data_to_store
        )
        db.add(label)
        db.flush()
        return label

    def update_func(existing_label):
        existing_label.sample_time = label_in.sample_time
        existing_label.sampler = label_in.sampler or existing_label.sampler
        existing_label.sample_location = label_in.sample_location or existing_label.sample_location
        existing_label.quantity = label_in.quantity or existing_label.quantity
        existing_label.unit = label_in.unit or existing_label.unit
        existing_label.storage_condition = label_in.storage_condition or existing_label.storage_condition
        return existing_label

    label = IdempotencyService.process_with_idempotency(
        db,
        label_in.idempotency_key,
        "sample_label",
        models.SampleLabel,
        create_func,
        update_func
    )

    dirty_records = validate_sample_label(detector, data_dict, batch, None)
    for dr in dirty_records:
        detector.add_dirty_record(dr)

    if batch.status == BatchStatus.CREATED:
        try:
            change_batch_state(db, batch, BatchStatus.ATTACHMENTS_UPLOADED, current_user, "上传留样标签")
        except StateTransitionError:
            pass

    db.commit()
    db.refresh(label)
    return label


@router.post("/{batch_id}/temperature-records", response_model=schemas.TemperatureRecord)
def add_temperature_record(
    batch_id: int,
    record_in: schemas.TemperatureRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    detector = DirtyRecordDetector(db)
    data_dict = record_in.model_dump()
    raw_data_to_store = to_json_serializable(record_in.raw_data or data_dict)

    def create_func():
        record = models.TemperatureRecord(
            batch_id=batch_id,
            record_time=record_in.record_time,
            temperature=record_in.temperature,
            measure_point=record_in.measure_point,
            recorder=record_in.recorder,
            is_abnormal=record_in.is_abnormal,
            remark=record_in.remark,
            idempotency_key=record_in.idempotency_key,
            raw_data=raw_data_to_store
        )
        db.add(record)
        db.flush()
        return record

    def update_func(existing_record):
        existing_record.temperature = record_in.temperature
        existing_record.measure_point = record_in.measure_point or existing_record.measure_point
        existing_record.recorder = record_in.recorder or existing_record.recorder
        existing_record.is_abnormal = record_in.is_abnormal
        existing_record.remark = record_in.remark or existing_record.remark
        return existing_record

    record = IdempotencyService.process_with_idempotency(
        db,
        record_in.idempotency_key,
        "temperature_record",
        models.TemperatureRecord,
        create_func,
        update_func
    )

    dirty_records = validate_temperature_record(detector, data_dict, batch, None)
    for dr in dirty_records:
        detector.add_dirty_record(dr)

    if batch.status == BatchStatus.CREATED:
        try:
            change_batch_state(db, batch, BatchStatus.ATTACHMENTS_UPLOADED, current_user, "上传温度记录")
        except StateTransitionError:
            pass

    db.commit()
    db.refresh(record)
    return record


@router.post("/{batch_id}/store-complaints", response_model=schemas.StoreComplaint)
def add_store_complaint(
    batch_id: int,
    complaint_in: schemas.StoreComplaintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    detector = DirtyRecordDetector(db)
    data_dict = complaint_in.model_dump()
    raw_data_to_store = to_json_serializable(complaint_in.raw_data or data_dict)

    existing_for_update = None
    existing_snapshot = None
    if complaint_in.idempotency_key:
        existing_idem = IdempotencyService.check_and_get_record(db, complaint_in.idempotency_key, "store_complaint")
        if existing_idem:
            existing_for_update = db.query(models.StoreComplaint).filter(
                models.StoreComplaint.id == existing_idem.record_id
            ).first()
            if existing_for_update:
                existing_snapshot = models.StoreComplaint(
                    store_name=existing_for_update.store_name,
                    amount=existing_for_update.amount,
                    quantity=existing_for_update.quantity
                )

    def create_func():
        complaint = models.StoreComplaint(
            batch_id=batch_id,
            store_name=complaint_in.store_name,
            store_code=complaint_in.store_code,
            complaint_time=complaint_in.complaint_time,
            complaint_type=complaint_in.complaint_type,
            complaint_content=complaint_in.complaint_content,
            quantity=complaint_in.quantity,
            amount=complaint_in.amount,
            contact_person=complaint_in.contact_person,
            contact_phone=complaint_in.contact_phone,
            status=complaint_in.status,
            idempotency_key=complaint_in.idempotency_key,
            raw_data=raw_data_to_store
        )
        db.add(complaint)
        db.flush()
        return complaint

    def update_func(existing_complaint):
        existing_complaint.complaint_type = complaint_in.complaint_type or existing_complaint.complaint_type
        existing_complaint.complaint_content = complaint_in.complaint_content
        existing_complaint.quantity = complaint_in.quantity if complaint_in.quantity is not None else existing_complaint.quantity
        existing_complaint.amount = complaint_in.amount if complaint_in.amount is not None else existing_complaint.amount
        existing_complaint.contact_person = complaint_in.contact_person or existing_complaint.contact_person
        existing_complaint.contact_phone = complaint_in.contact_phone or existing_complaint.contact_phone
        existing_complaint.status = complaint_in.status
        return existing_complaint

    complaint = IdempotencyService.process_with_idempotency(
        db,
        complaint_in.idempotency_key,
        "store_complaint",
        models.StoreComplaint,
        create_func,
        update_func
    )

    dirty_records = validate_store_complaint(detector, data_dict, batch, existing_snapshot)
    for dr in dirty_records:
        detector.add_dirty_record(dr)

    if batch.status == BatchStatus.CREATED:
        try:
            change_batch_state(db, batch, BatchStatus.ATTACHMENTS_UPLOADED, current_user, "上传门店投诉")
        except StateTransitionError:
            pass

    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{batch_id}/supervisor-comments", response_model=schemas.SupervisorComment)
def add_supervisor_comment(
    batch_id: int,
    comment_in: schemas.SupervisorCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    comment = models.SupervisorComment(
        batch_id=batch_id,
        supervisor_id=current_user.id,
        comment_type=comment_in.comment_type,
        content=comment_in.content,
        attachment_urls=comment_in.attachment_urls
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/{batch_id}/start-review")
def start_review(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        change_batch_state(db, batch, BatchStatus.REVIEWING, current_user, "开始复核")
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "已进入复核状态", "status": batch.status}


@router.post("/{batch_id}/review")
def review_batch(
    batch_id: int,
    review_data: schemas.BatchReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
) -> dict:
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        change_batch_state(db, batch, BatchStatus.REVIEWED, current_user, review_data.review_comment)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    batch.reviewed_by = current_user.id
    batch.reviewed_at = datetime.utcnow()
    batch.review_result = review_data.review_result
    batch.review_comment = review_data.review_comment

    db.commit()
    db.refresh(batch)
    
    batch_dict = batch_to_dict(batch)
    filtered_dict = FieldPermissionService.filter_batch_fields(batch_dict, current_user.role)
    return filtered_dict


@router.post("/{batch_id}/freeze")
def freeze_batch_endpoint(
    batch_id: int,
    freeze_data: schemas.BatchFreeze,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        freeze_batch(db, batch, current_user, freeze_data.reason)
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "批次已冻结", "status": batch.status, "before_freeze_status": batch.before_freeze_status}


@router.post("/{batch_id}/unfreeze")
def unfreeze_batch_endpoint(
    batch_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        unfreeze_batch(db, batch, current_user, reason)
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "批次已解冻", "status": batch.status}


@router.post("/{batch_id}/settle")
def settle_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        change_batch_state(db, batch, BatchStatus.SETTLED, current_user, "结算")
        batch.settled_at = datetime.utcnow()
        batch.settled_by = current_user.id
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "批次已结算", "status": batch.status}


@router.post("/{batch_id}/withdraw")
def withdraw_batch(
    batch_id: int,
    withdraw_data: schemas.BatchWithdraw,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        change_batch_state(db, batch, BatchStatus.WITHDRAWN, current_user, withdraw_data.reason)
        batch.withdrawn_at = datetime.utcnow()
        batch.withdrawn_by = current_user.id
        batch.withdraw_reason = withdraw_data.reason
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "批次已撤回", "status": batch.status}


@router.post("/{batch_id}/archive")
def archive_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR))
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        change_batch_state(db, batch, BatchStatus.ARCHIVED, current_user, "归档")
        batch.archived_at = datetime.utcnow()
        db.commit()
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "批次已归档", "status": batch.status}


@router.get("/{batch_id}/dirty-records", response_model=List[schemas.DirtyRecord])
def get_dirty_records(
    batch_id: int,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    query = db.query(models.DirtyRecord).filter(models.DirtyRecord.batch_id == batch_id)
    if resolved is not None:
        query = query.filter(models.DirtyRecord.is_resolved == resolved)

    return query.all()


@router.post("/dirty-records/{record_id}/resolve")
def resolve_dirty_record(
    record_id: int,
    resolve_data: schemas.DirtyRecordResolve,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    detector = DirtyRecordDetector(db)
    record = detector.resolve_dirty_record(record_id, resolve_data.processing_opinion, current_user.id)
    if not record:
        raise HTTPException(status_code=404, detail="脏记录不存在")

    db.commit()
    return {"message": "脏记录已处理", "record_id": record_id}
